import { Response } from 'express';
import { TechnologyDisclosure } from '../models/TechnologyDisclosure';
import { Patent } from '../models/Patent';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';
import { invalidateAllDashboardCaches, cacheGet, cacheSet, cacheInvalidatePrefix } from '../config/redis';

export const getDisclosures = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, project, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = {};
    if (status) filter.reviewStatus = status;
    if (priority) filter.priority = priority;
    if (project) filter.project = project;

    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { disclosureId: { $regex: search, $options: 'i' } },
        { inventor: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const isDefaultQuery = !status && !priority && !project && !search && sortBy === 'createdAt' && order === 'desc';
    const cacheKey = 'cache:disclosures:all';

    if (isDefaultQuery) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, count: cached.length, disclosures: cached, fromCache: true });
        return;
      }
    }

    const disclosures = await TechnologyDisclosure.find(filter)
      .populate('project', 'name code department')
      .populate('convertedPatent', 'title patentNumber applicationStatus')
      .sort(sortOption);

    if (isDefaultQuery) {
      await cacheSet(cacheKey, disclosures, 180);
    }

    res.status(200).json({
      success: true,
      count: disclosures.length,
      disclosures,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDisclosureById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const disclosure = await TechnologyDisclosure.findById(id)
      .populate('project', 'name code department status')
      .populate('convertedPatent', 'title patentNumber applicationStatus');

    if (!disclosure) {
      res.status(404).json({ success: false, message: 'Technology disclosure not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      disclosure,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDisclosure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, disclosureId, inventor, project, description, priority, reviewer } = req.body;

    if (!title || !project) {
      res.status(400).json({
        success: false,
        message: 'Disclosure title and associated project are required.',
      });
      return;
    }

    // Auto-generate disclosureId if missing
    const generatedId = disclosureId?.trim() || `TD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await TechnologyDisclosure.findOne({ disclosureId: generatedId.toUpperCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `A disclosure with ID "${generatedId}" already exists.`,
      });
      return;
    }

    const disclosure = await TechnologyDisclosure.create({
      title: title.trim(),
      disclosureId: generatedId.toUpperCase(),
      inventor: inventor?.trim() || req.user?.name || 'Lead Researcher',
      project,
      description: description?.trim() || '',
      submissionDate: new Date(),
      reviewStatus: 'Submitted',
      reviewer: reviewer?.trim() || 'IP Committee',
      priority: priority || 'Medium',
      createdBy: req.user?._id,
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'SUBMIT_DISCLOSURE',
      entityType: 'TechnologyDisclosure',
      entityId: disclosure._id.toString(),
      details: `Submitted technology disclosure "${disclosure.title}" [${disclosure.disclosureId}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:disclosures'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Technology disclosure submitted successfully.',
      disclosure,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDisclosure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const disclosure = await TechnologyDisclosure.findById(id);

    if (!disclosure) {
      res.status(404).json({ success: false, message: 'Technology disclosure not found.' });
      return;
    }

    // Researchers can only update if it is in 'Submitted' state or they are Admin/IP Manager
    const isOwnerOrPrivileged =
      req.user?.role === 'ADMIN' ||
      req.user?.role === 'IP MANAGER' ||
      (disclosure.reviewStatus === 'Submitted' && String(disclosure.createdBy) === String(req.user?._id));

    if (!isOwnerOrPrivileged) {
      res.status(403).json({
        success: false,
        message: 'Cannot edit disclosure after review process has commenced without IP Manager / Admin permissions.',
      });
      return;
    }

    const fields = ['title', 'inventor', 'project', 'description', 'priority'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        (disclosure as any)[f] = req.body[f];
      }
    });

    // Only Admin & IP Manager can modify review fields
    if (req.user?.role === 'ADMIN' || req.user?.role === 'IP MANAGER') {
      if (req.body.reviewStatus) disclosure.reviewStatus = req.body.reviewStatus;
      if (req.body.reviewer) disclosure.reviewer = req.body.reviewer;
      if (req.body.decision) disclosure.decision = req.body.decision;
    }

    await disclosure.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_DISCLOSURE',
      entityType: 'TechnologyDisclosure',
      entityId: disclosure._id.toString(),
      details: `Updated disclosure "${disclosure.title}" status: ${disclosure.reviewStatus}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:disclosures'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Technology disclosure updated successfully.',
      disclosure,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Convert Approved Technology Disclosure to a new Patent Application
 */
export const convertToPatent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { patentNumber, jurisdiction, owner, description } = req.body;

    const disclosure = await TechnologyDisclosure.findById(id).populate('project');
    if (!disclosure) {
      res.status(404).json({ success: false, message: 'Technology disclosure not found.' });
      return;
    }

    if (disclosure.convertedPatent) {
      res.status(400).json({
        success: false,
        message: 'This technology disclosure has already been converted to a patent.',
      });
      return;
    }

    const newPatentNumber =
      patentNumber?.trim() || `PAT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create new Patent record
    const patent = await Patent.create({
      title: disclosure.title,
      patentNumber: newPatentNumber,
      inventors: [disclosure.inventor],
      project: disclosure.project,
      filingDate: new Date(),
      applicationStatus: 'Draft',
      jurisdiction: jurisdiction?.trim() || 'USPTO (US)',
      owner: owner?.trim() || 'BioVault Therapeutics Inc.',
      description: description || disclosure.description,
      technologyDisclosure: disclosure._id,
      createdBy: req.user?._id,
    });

    // Update disclosure state
    disclosure.reviewStatus = 'Converted to Patent';
    disclosure.convertedPatent = patent._id as any;
    disclosure.decision = `Converted to patent application ${patent.patentNumber} on ${new Date().toLocaleDateString()}`;
    await disclosure.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CONVERT_DISCLOSURE_TO_PATENT',
      entityType: 'TechnologyDisclosure',
      entityId: disclosure._id.toString(),
      details: `Converted disclosure [${disclosure.disclosureId}] to Patent [${patent.patentNumber}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:disclosures'),
      cacheInvalidatePrefix('cache:patents'),
    ]);

    res.status(201).json({
      success: true,
      message: `Technology disclosure successfully converted to patent application ${patent.patentNumber}.`,
      patent,
      disclosure,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDisclosure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const disclosure = await TechnologyDisclosure.findByIdAndDelete(id);

    if (!disclosure) {
      res.status(404).json({ success: false, message: 'Technology disclosure not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_DISCLOSURE',
      entityType: 'TechnologyDisclosure',
      entityId: id,
      details: `Deleted disclosure [${disclosure.disclosureId}] "${disclosure.title}"`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:disclosures'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Technology disclosure deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
