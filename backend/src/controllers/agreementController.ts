import { Response } from 'express';
import { LicensingAgreement } from '../models/LicensingAgreement';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';
import { invalidateAllDashboardCaches, cacheGet, cacheSet, cacheInvalidatePrefix } from '../config/redis';

export const getAgreements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, agreementType, project, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (agreementType) filter.agreementType = agreementType;
    if (project) filter.project = project;

    if (search && typeof search === 'string') {
      filter.$or = [
        { agreementName: { $regex: search, $options: 'i' } },
        { agreementId: { $regex: search, $options: 'i' } },
        { licensee: { $regex: search, $options: 'i' } },
        { licensor: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const isDefaultQuery = !status && !agreementType && !project && !search && sortBy === 'createdAt' && order === 'desc';
    const cacheKey = 'cache:agreements:all';

    if (isDefaultQuery) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, count: cached.length, agreements: cached, fromCache: true });
        return;
      }
    }

    const agreements = await LicensingAgreement.find(filter)
      .populate('patent', 'title patentNumber applicationStatus')
      .populate('project', 'name code department')
      .sort(sortOption);

    // Auto-update expired agreements if past end date and active
    const now = new Date();
    for (const a of agreements) {
      if (a.status === 'Active' && a.endDate && new Date(a.endDate) < now) {
        a.status = 'Expired';
        await a.save();
      }
    }

    if (isDefaultQuery) {
      await cacheSet(cacheKey, agreements, 180);
    }

    res.status(200).json({
      success: true,
      count: agreements.length,
      agreements,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAgreementById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const agreement = await LicensingAgreement.findById(id)
      .populate('patent', 'title patentNumber applicationStatus jurisdiction')
      .populate('project', 'name code department status');

    if (!agreement) {
      res.status(404).json({ success: false, message: 'Licensing agreement not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      agreement,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      agreementName,
      agreementId,
      patent,
      project,
      licensee,
      licensor,
      agreementType,
      startDate,
      endDate,
      royaltyInfo,
      status,
      description,
    } = req.body;

    if (!agreementName || !licensee || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Agreement name, licensee organization, start date, and end date are required.',
      });
      return;
    }

    const generatedId = agreementId?.trim() || `LA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const existing = await LicensingAgreement.findOne({ agreementId: generatedId.toUpperCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `An agreement with ID "${generatedId}" already exists.`,
      });
      return;
    }

    const agreement = await LicensingAgreement.create({
      agreementName: agreementName.trim(),
      agreementId: generatedId.toUpperCase(),
      patent: patent || null,
      project: project || null,
      licensee: licensee.trim(),
      licensor: licensor?.trim() || 'BioVault Therapeutics Inc.',
      agreementType: agreementType?.trim() || 'Exclusive Commercial License',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      royaltyInfo: royaltyInfo?.trim() || '',
      status: status || 'Draft',
      description: description?.trim() || '',
      createdBy: req.user?._id,
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_AGREEMENT',
      entityType: 'LicensingAgreement',
      entityId: agreement._id.toString(),
      details: `Created licensing agreement "${agreement.agreementName}" with ${agreement.licensee}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:agreements'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Licensing agreement created successfully.',
      agreement,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const agreement = await LicensingAgreement.findById(id);

    if (!agreement) {
      res.status(404).json({ success: false, message: 'Licensing agreement not found.' });
      return;
    }

    const fields = [
      'agreementName',
      'patent',
      'project',
      'licensee',
      'licensor',
      'agreementType',
      'startDate',
      'endDate',
      'royaltyInfo',
      'status',
      'description',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        (agreement as any)[f] = req.body[f];
      }
    });

    await agreement.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_AGREEMENT',
      entityType: 'LicensingAgreement',
      entityId: agreement._id.toString(),
      details: `Updated licensing agreement "${agreement.agreementName}" status: ${agreement.status}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:agreements'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Licensing agreement updated successfully.',
      agreement,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const agreement = await LicensingAgreement.findByIdAndDelete(id);

    if (!agreement) {
      res.status(404).json({ success: false, message: 'Licensing agreement not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_AGREEMENT',
      entityType: 'LicensingAgreement',
      entityId: id,
      details: `Deleted licensing agreement "${agreement.agreementName}" [${agreement.agreementId}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:agreements'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Licensing agreement deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
