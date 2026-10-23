import { Response } from 'express';
import { ComplianceItem } from '../models/ComplianceItem';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';
import { invalidateAllDashboardCaches, cacheGet, cacheSet, cacheInvalidatePrefix } from '../config/redis';

export const getComplianceItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, riskLevel, category, project, search, sortBy = 'dueDate', order = 'asc' } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (category) filter.category = category;
    if (project) filter.project = project;

    if (search && typeof search === 'string') {
      filter.$or = [
        { complianceItem: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { responsiblePerson: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const isDefaultQuery = !status && !riskLevel && !category && !project && !search && sortBy === 'dueDate' && order === 'asc';
    const cacheKey = 'cache:compliance:all';

    if (isDefaultQuery) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, count: cached.length, complianceItems: cached, fromCache: true });
        return;
      }
    }

    const items = await ComplianceItem.find(filter)
      .populate('project', 'name code department')
      .sort(sortOption);

    // Auto-update overdue records
    const now = new Date();
    for (const item of items) {
      if (item.status !== 'Completed' && new Date(item.dueDate) < now && item.status !== 'Overdue') {
        item.status = 'Overdue';
        await item.save();
      }
    }

    if (isDefaultQuery) {
      await cacheSet(cacheKey, items, 180);
    }

    res.status(200).json({
      success: true,
      count: items.length,
      complianceItems: items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getComplianceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await ComplianceItem.findById(id).populate('project', 'name code department status');

    if (!item) {
      res.status(404).json({ success: false, message: 'Compliance record not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      complianceItem: item,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createComplianceItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { complianceItem, category, project, responsiblePerson, dueDate, status, riskLevel, description } =
      req.body;

    if (!complianceItem || !project || !responsiblePerson || !dueDate) {
      res.status(400).json({
        success: false,
        message: 'Compliance item title, project association, responsible person, and due date are required.',
      });
      return;
    }

    // Auto-compute status if past date
    let computedStatus = status || 'Pending';
    if (computedStatus !== 'Completed' && new Date(dueDate) < new Date()) {
      computedStatus = 'Overdue';
    }

    const item = await ComplianceItem.create({
      complianceItem: complianceItem.trim(),
      category: category?.trim() || 'Biosafety (BSL-2/3)',
      project,
      responsiblePerson: responsiblePerson.trim(),
      dueDate: new Date(dueDate),
      status: computedStatus,
      riskLevel: riskLevel || 'Medium',
      description: description?.trim() || '',
      createdBy: req.user?._id,
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_COMPLIANCE_ITEM',
      entityType: 'ComplianceItem',
      entityId: item._id.toString(),
      details: `Created compliance requirement "${item.complianceItem}" [Risk: ${item.riskLevel}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:compliance'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Compliance item created successfully.',
      complianceItem: item,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateComplianceItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await ComplianceItem.findById(id);

    if (!item) {
      res.status(404).json({ success: false, message: 'Compliance record not found.' });
      return;
    }

    const fields = [
      'complianceItem',
      'category',
      'project',
      'responsiblePerson',
      'dueDate',
      'status',
      'riskLevel',
      'description',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        (item as any)[f] = req.body[f];
      }
    });

    // Re-check overdue
    if (item.status !== 'Completed' && new Date(item.dueDate) < new Date()) {
      item.status = 'Overdue';
    }

    await item.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_COMPLIANCE_ITEM',
      entityType: 'ComplianceItem',
      entityId: item._id.toString(),
      details: `Updated compliance record "${item.complianceItem}" status: ${item.status}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:compliance'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Compliance item updated successfully.',
      complianceItem: item,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteComplianceItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await ComplianceItem.findByIdAndDelete(id);

    if (!item) {
      res.status(404).json({ success: false, message: 'Compliance record not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_COMPLIANCE_ITEM',
      entityType: 'ComplianceItem',
      entityId: id,
      details: `Deleted compliance item "${item.complianceItem}"`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:compliance'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Compliance record deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
