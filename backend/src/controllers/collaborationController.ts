import { Response } from 'express';
import { ResearchCollaboration } from '../models/ResearchCollaboration';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';
import { invalidateAllDashboardCaches, cacheGet, cacheSet, cacheInvalidatePrefix } from '../config/redis';

export const getCollaborations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, collaborationType, project, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (collaborationType) filter.collaborationType = collaborationType;
    if (project) filter.project = project;

    if (search && typeof search === 'string') {
      filter.$or = [
        { collaborationName: { $regex: search, $options: 'i' } },
        { collaborationId: { $regex: search, $options: 'i' } },
        { partnerOrganization: { $regex: search, $options: 'i' } },
        { leadResearcher: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const isDefaultQuery = !status && !collaborationType && !project && !search && sortBy === 'createdAt' && order === 'desc';
    const cacheKey = 'cache:collaborations:all';

    if (isDefaultQuery) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, count: cached.length, collaborations: cached, fromCache: true });
        return;
      }
    }

    const collaborations = await ResearchCollaboration.find(filter)
      .populate('project', 'name code department')
      .sort(sortOption);

    if (isDefaultQuery) {
      await cacheSet(cacheKey, collaborations, 180);
    }

    res.status(200).json({
      success: true,
      count: collaborations.length,
      collaborations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCollaborationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const collaboration = await ResearchCollaboration.findById(id).populate('project', 'name code department status');

    if (!collaboration) {
      res.status(404).json({ success: false, message: 'Research collaboration not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      collaboration,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCollaboration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      collaborationName,
      collaborationId,
      project,
      partnerOrganization,
      leadResearcher,
      startDate,
      endDate,
      collaborationType,
      status,
      description,
    } = req.body;

    if (!collaborationName || !project || !partnerOrganization || !leadResearcher) {
      res.status(400).json({
        success: false,
        message: 'Collaboration name, associated project, partner organization, and lead researcher are required.',
      });
      return;
    }

    const generatedId =
      collaborationId?.trim() || `RC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const existing = await ResearchCollaboration.findOne({ collaborationId: generatedId.toUpperCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `A collaboration with ID "${generatedId}" already exists.`,
      });
      return;
    }

    const collaboration = await ResearchCollaboration.create({
      collaborationName: collaborationName.trim(),
      collaborationId: generatedId.toUpperCase(),
      project,
      partnerOrganization: partnerOrganization.trim(),
      leadResearcher: leadResearcher.trim(),
      startDate: startDate || new Date(),
      endDate: endDate || null,
      collaborationType: collaborationType?.trim() || 'Co-Development',
      status: status || 'Proposed',
      description: description?.trim() || '',
      createdBy: req.user?._id,
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_COLLABORATION',
      entityType: 'ResearchCollaboration',
      entityId: collaboration._id.toString(),
      details: `Created collaboration "${collaboration.collaborationName}" with ${collaboration.partnerOrganization}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:collaborations'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Research collaboration created successfully.',
      collaboration,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCollaboration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const collaboration = await ResearchCollaboration.findById(id);

    if (!collaboration) {
      res.status(404).json({ success: false, message: 'Research collaboration not found.' });
      return;
    }

    const fields = [
      'collaborationName',
      'project',
      'partnerOrganization',
      'leadResearcher',
      'startDate',
      'endDate',
      'collaborationType',
      'status',
      'description',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        (collaboration as any)[f] = req.body[f];
      }
    });

    await collaboration.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_COLLABORATION',
      entityType: 'ResearchCollaboration',
      entityId: collaboration._id.toString(),
      details: `Updated collaboration "${collaboration.collaborationName}" status: ${collaboration.status}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:collaborations'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Research collaboration updated successfully.',
      collaboration,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCollaboration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const collaboration = await ResearchCollaboration.findByIdAndDelete(id);

    if (!collaboration) {
      res.status(404).json({ success: false, message: 'Research collaboration not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_COLLABORATION',
      entityType: 'ResearchCollaboration',
      entityId: id,
      details: `Deleted collaboration "${collaboration.collaborationName}" [${collaboration.collaborationId}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:collaborations'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Research collaboration deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
