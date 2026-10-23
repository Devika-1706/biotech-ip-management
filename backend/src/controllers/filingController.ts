import { Response } from 'express';
import { RegulatoryFiling } from '../models/RegulatoryFiling';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';
import { invalidateAllDashboardCaches, cacheGet, cacheSet, cacheInvalidatePrefix } from '../config/redis';

export const getFilings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, authority, project, search, sortBy = 'dueDate', order = 'asc' } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (authority) filter.regulatoryAuthority = authority;
    if (project) filter.project = project;

    if (search && typeof search === 'string') {
      filter.$or = [
        { filingName: { $regex: search, $options: 'i' } },
        { filingId: { $regex: search, $options: 'i' } },
        { regulatoryAuthority: { $regex: search, $options: 'i' } },
        { filingType: { $regex: search, $options: 'i' } },
        { responsiblePerson: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const isDefaultQuery = !status && !authority && !project && !search && sortBy === 'dueDate' && order === 'asc';
    const cacheKey = 'cache:filings:all';

    if (isDefaultQuery) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, count: cached.length, filings: cached, fromCache: true });
        return;
      }
    }

    const filings = await RegulatoryFiling.find(filter)
      .populate('project', 'name code department')
      .sort(sortOption);

    // Compute deadline tags (isOverdue, isUpcomingWithin30Days)
    const now = new Date();
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const enrichedFilings = filings.map((f) => {
      const isCompleted = f.status === 'Approved' || f.status === 'Submitted';
      const isOverdue = !isCompleted && new Date(f.dueDate) < now;
      const isUpcoming = !isCompleted && !isOverdue && new Date(f.dueDate) <= thirtyDaysLater;

      return {
        ...f.toObject(),
        isOverdue,
        isUpcoming,
      };
    });

    if (isDefaultQuery) {
      await cacheSet(cacheKey, enrichedFilings, 180);
    }

    res.status(200).json({
      success: true,
      count: enrichedFilings.length,
      filings: enrichedFilings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFilingById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const filing = await RegulatoryFiling.findById(id).populate('project', 'name code department status');

    if (!filing) {
      res.status(404).json({ success: false, message: 'Regulatory filing record not found.' });
      return;
    }

    const now = new Date();
    const isCompleted = filing.status === 'Approved' || filing.status === 'Submitted';
    const isOverdue = !isCompleted && new Date(filing.dueDate) < now;

    res.status(200).json({
      success: true,
      filing: {
        ...filing.toObject(),
        isOverdue,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFiling = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      filingName,
      filingId,
      project,
      regulatoryAuthority,
      filingType,
      submissionDate,
      dueDate,
      status,
      responsiblePerson,
      description,
    } = req.body;

    if (!filingName || !project || !dueDate || !responsiblePerson) {
      res.status(400).json({
        success: false,
        message: 'Filing name, associated project, deadline date, and responsible person are required.',
      });
      return;
    }

    const generatedId =
      filingId?.trim() || `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await RegulatoryFiling.findOne({ filingId: generatedId.toUpperCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `A filing with ID "${generatedId}" already exists.`,
      });
      return;
    }

    const filing = await RegulatoryFiling.create({
      filingName: filingName.trim(),
      filingId: generatedId.toUpperCase(),
      project,
      regulatoryAuthority: regulatoryAuthority?.trim() || 'FDA (United States)',
      filingType: filingType?.trim() || 'IND (Investigational New Drug)',
      submissionDate: submissionDate || null,
      dueDate: new Date(dueDate),
      status: status || 'Draft',
      responsiblePerson: responsiblePerson.trim(),
      description: description?.trim() || '',
      createdBy: req.user?._id,
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_REGULATORY_FILING',
      entityType: 'RegulatoryFiling',
      entityId: filing._id.toString(),
      details: `Created regulatory filing "${filing.filingName}" [${filing.filingId}] due ${new Date(filing.dueDate).toLocaleDateString()}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:filings'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Regulatory filing record created successfully.',
      filing,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFiling = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const filing = await RegulatoryFiling.findById(id);

    if (!filing) {
      res.status(404).json({ success: false, message: 'Regulatory filing record not found.' });
      return;
    }

    const fields = [
      'filingName',
      'project',
      'regulatoryAuthority',
      'filingType',
      'submissionDate',
      'dueDate',
      'status',
      'responsiblePerson',
      'description',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        (filing as any)[f] = req.body[f];
      }
    });

    await filing.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_REGULATORY_FILING',
      entityType: 'RegulatoryFiling',
      entityId: filing._id.toString(),
      details: `Updated regulatory filing "${filing.filingName}" status: ${filing.status}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:filings'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Regulatory filing updated successfully.',
      filing,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFiling = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const filing = await RegulatoryFiling.findByIdAndDelete(id);

    if (!filing) {
      res.status(404).json({ success: false, message: 'Regulatory filing record not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_REGULATORY_FILING',
      entityType: 'RegulatoryFiling',
      entityId: id,
      details: `Deleted regulatory filing "${filing.filingName}" [${filing.filingId}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:filings'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Regulatory filing deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
