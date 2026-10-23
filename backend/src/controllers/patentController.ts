import { Response } from 'express';
import { Patent } from '../models/Patent';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';
import { invalidateAllDashboardCaches, cacheGet, cacheSet, cacheInvalidatePrefix } from '../config/redis';

export const getPatents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, jurisdiction, project, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = {};
    if (status) filter.applicationStatus = status;
    if (jurisdiction) filter.jurisdiction = jurisdiction;
    if (project) filter.project = project;

    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { patentNumber: { $regex: search, $options: 'i' } },
        { inventors: { $regex: search, $options: 'i' } },
        { owner: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const isDefaultQuery = !status && !jurisdiction && !project && !search && sortBy === 'createdAt' && order === 'desc';
    const cacheKey = 'cache:patents:all';

    if (isDefaultQuery) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, count: cached.length, patents: cached, fromCache: true });
        return;
      }
    }

    const patents = await Patent.find(filter).populate('project', 'name code department').sort(sortOption);

    if (isDefaultQuery) {
      await cacheSet(cacheKey, patents, 180);
    }

    res.status(200).json({
      success: true,
      count: patents.length,
      patents,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPatentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patent = await Patent.findById(id)
      .populate('project', 'name code department status')
      .populate('technologyDisclosure', 'title disclosureId submissionDate');

    if (!patent) {
      res.status(404).json({ success: false, message: 'Patent not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      patent,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPatent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      patentNumber,
      inventors,
      project,
      filingDate,
      priorityDate,
      applicationStatus,
      jurisdiction,
      owner,
      expiryDate,
      description,
      technologyDisclosure,
    } = req.body;

    if (!title || !patentNumber || !project) {
      res.status(400).json({
        success: false,
        message: 'Patent title, patent number, and project association are required.',
      });
      return;
    }

    const existing = await Patent.findOne({ patentNumber: patentNumber.trim() });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `A patent with number "${patentNumber}" already exists.`,
      });
      return;
    }

    const inventorsList = Array.isArray(inventors)
      ? inventors
      : typeof inventors === 'string'
      ? inventors.split(',').map((s) => s.trim())
      : ['Primary Inventor'];

    const patent = await Patent.create({
      title: title.trim(),
      patentNumber: patentNumber.trim(),
      inventors: inventorsList,
      project,
      filingDate: filingDate || new Date(),
      priorityDate: priorityDate || null,
      applicationStatus: applicationStatus || 'Draft',
      jurisdiction: jurisdiction?.trim() || 'USPTO (US)',
      owner: owner?.trim() || 'BioVault Therapeutics Inc.',
      expiryDate: expiryDate || null,
      description: description?.trim() || '',
      technologyDisclosure: technologyDisclosure || null,
      createdBy: req.user?._id,
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_PATENT',
      entityType: 'Patent',
      entityId: patent._id.toString(),
      details: `Created patent record "${patent.title}" [${patent.patentNumber}] - ${patent.applicationStatus}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:patents'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Patent created successfully.',
      patent,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePatent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patent = await Patent.findById(id);

    if (!patent) {
      res.status(404).json({ success: false, message: 'Patent not found.' });
      return;
    }

    const fields = [
      'title',
      'patentNumber',
      'project',
      'filingDate',
      'priorityDate',
      'applicationStatus',
      'jurisdiction',
      'owner',
      'expiryDate',
      'description',
      'technologyDisclosure',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        (patent as any)[f] = req.body[f];
      }
    });

    if (req.body.inventors) {
      patent.inventors = Array.isArray(req.body.inventors)
        ? req.body.inventors
        : String(req.body.inventors).split(',').map((s) => s.trim());
    }

    await patent.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_PATENT',
      entityType: 'Patent',
      entityId: patent._id.toString(),
      details: `Updated patent "${patent.title}" [${patent.patentNumber}] status to ${patent.applicationStatus}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:patents'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Patent updated successfully.',
      patent,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePatent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patent = await Patent.findByIdAndDelete(id);

    if (!patent) {
      res.status(404).json({ success: false, message: 'Patent not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_PATENT',
      entityType: 'Patent',
      entityId: id,
      details: `Deleted patent "${patent.title}" [${patent.patentNumber}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:patents'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Patent deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
