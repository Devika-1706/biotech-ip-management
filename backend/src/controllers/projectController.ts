import { Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Patent } from '../models/Patent';
import { TechnologyDisclosure } from '../models/TechnologyDisclosure';
import { LicensingAgreement } from '../models/LicensingAgreement';
import { RegulatoryFiling } from '../models/RegulatoryFiling';
import { ComplianceItem } from '../models/ComplianceItem';
import { ResearchCollaboration } from '../models/ResearchCollaboration';
import { DocumentRecord } from '../models/Document';
import { ActivityLog, logActivity } from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { invalidateAllDashboardCaches, cacheGet, cacheSet, cacheInvalidatePrefix } from '../config/redis';

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, department, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    // Check cache for plain un-queried list
    const isDefaultQuery = !status && !priority && !department && !search && sortBy === 'createdAt' && order === 'desc';
    const cacheKey = 'cache:projects:all:enriched';

    if (isDefaultQuery) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.status(200).json({ success: true, count: cached.length, projects: cached, fromCache: true });
        return;
      }
    }

    const projects = await Project.find(filter).sort(sortOption).lean();
    const projectIds = projects.map((p) => p._id);
    const projectIdStrings = projectIds.map((id) => id.toString());

    // Aggregate counts for all projects in parallel
    const [
      patentCounts,
      disclosureCounts,
      agreementCounts,
      filingCounts,
      complianceCounts,
      collabCounts,
      docCounts,
    ] = await Promise.all([
      Patent.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
      ]),
      TechnologyDisclosure.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
      ]),
      LicensingAgreement.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
      ]),
      RegulatoryFiling.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
      ]),
      ComplianceItem.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
      ]),
      ResearchCollaboration.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
      ]),
      DocumentRecord.aggregate([
        {
          $match: {
            $or: [
              { project: { $in: projectIds } },
              { relatedEntityType: 'Project', relatedEntityId: { $in: projectIdStrings } },
            ],
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$project', '$relatedEntityId'] },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countMap: Record<string, any> = {};
    projectIds.forEach((id) => {
      countMap[id.toString()] = {
        patents: 0,
        disclosures: 0,
        agreements: 0,
        filings: 0,
        compliance: 0,
        collaborations: 0,
        documents: 0,
      };
    });

    patentCounts.forEach((c) => {
      if (c._id && countMap[c._id.toString()]) countMap[c._id.toString()].patents = c.count;
    });
    disclosureCounts.forEach((c) => {
      if (c._id && countMap[c._id.toString()]) countMap[c._id.toString()].disclosures = c.count;
    });
    agreementCounts.forEach((c) => {
      if (c._id && countMap[c._id.toString()]) countMap[c._id.toString()].agreements = c.count;
    });
    filingCounts.forEach((c) => {
      if (c._id && countMap[c._id.toString()]) countMap[c._id.toString()].filings = c.count;
    });
    complianceCounts.forEach((c) => {
      if (c._id && countMap[c._id.toString()]) countMap[c._id.toString()].compliance = c.count;
    });
    collabCounts.forEach((c) => {
      if (c._id && countMap[c._id.toString()]) countMap[c._id.toString()].collaborations = c.count;
    });
    docCounts.forEach((c) => {
      if (c._id && countMap[c._id.toString()]) countMap[c._id.toString()].documents = c.count;
    });

    const enrichedProjects = projects.map((p) => ({
      ...p,
      counts: countMap[p._id.toString()] || {
        patents: 0,
        disclosures: 0,
        agreements: 0,
        filings: 0,
        compliance: 0,
        collaborations: 0,
        documents: 0,
      },
    }));

    if (isDefaultQuery) {
      await cacheSet(cacheKey, enrichedProjects, 180);
    }

    res.status(200).json({
      success: true,
      count: enrichedProjects.length,
      projects: enrichedProjects,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid project ID format.' });
      return;
    }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    // Fetch related counts and summary
    const [
      patentsCount,
      disclosuresCount,
      agreementsCount,
      filingsCount,
      complianceCount,
      collaborationsCount,
      documentsCount,
    ] = await Promise.all([
      Patent.countDocuments({ project: id }),
      TechnologyDisclosure.countDocuments({ project: id }),
      LicensingAgreement.countDocuments({ project: id }),
      RegulatoryFiling.countDocuments({ project: id }),
      ComplianceItem.countDocuments({ project: id }),
      ResearchCollaboration.countDocuments({ project: id }),
      DocumentRecord.countDocuments({
        $or: [{ project: id }, { relatedEntityType: 'Project', relatedEntityId: id }],
      }),
    ]);

    res.status(200).json({
      success: true,
      project,
      summary: {
        patents: patentsCount,
        disclosures: disclosuresCount,
        agreements: agreementsCount,
        filings: filingsCount,
        compliance: complianceCount,
        collaborations: collaborationsCount,
        documents: documentsCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid project ID format.' });
      return;
    }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const cacheKey = `cache:project:${id}:overview`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, ...cached, fromCache: true });
      return;
    }

    // Parallel queries for all project metrics
    const [
      patents,
      disclosures,
      agreements,
      filings,
      complianceItems,
      collaborations,
      documents,
      recentActivity,
    ] = await Promise.all([
      Patent.find({ project: id }).lean(),
      TechnologyDisclosure.find({ project: id }).lean(),
      LicensingAgreement.find({ project: id }).lean(),
      RegulatoryFiling.find({ project: id }).lean(),
      ComplianceItem.find({ project: id }).lean(),
      ResearchCollaboration.find({ project: id }).lean(),
      DocumentRecord.find({
        $or: [{ project: id }, { relatedEntityType: 'Project', relatedEntityId: id }],
      }).lean(),
      ActivityLog.find({
        $or: [{ project: id }, { entityId: id, entityType: 'Project' }],
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    // Breakdown metrics
    const patentsGranted = patents.filter((p) => p.applicationStatus === 'Granted').length;
    const patentsFiled = patents.filter((p) => p.applicationStatus === 'Filed' || p.applicationStatus === 'Under Examination').length;
    const disclosuresApproved = disclosures.filter((d) => d.reviewStatus === 'Approved' || d.reviewStatus === 'Converted to Patent').length;
    const disclosuresPending = disclosures.filter((d) => d.reviewStatus === 'Submitted' || d.reviewStatus === 'Under Review').length;
    const agreementsActive = agreements.filter((a) => a.status === 'Active').length;
    const filingsApproved = filings.filter((f) => f.status === 'Approved').length;
    const filingsPending = filings.filter((f) => f.status !== 'Approved' && f.status !== 'Rejected').length;
    const complianceCritical = complianceItems.filter((c) => (c.riskLevel === 'High' || c.riskLevel === 'Critical') && c.status !== 'Completed').length;
    const compliancePending = complianceItems.filter((c) => c.status !== 'Completed').length;

    // Build timeline deadlines
    const now = new Date();
    const deadlines: any[] = [];

    filings.forEach((f) => {
      if (f.dueDate) {
        const due = new Date(f.dueDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: f._id,
          title: f.filingName,
          category: 'Regulatory Filing',
          authority: f.regulatoryAuthority,
          dueDate: f.dueDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0 && f.status !== 'Approved',
          status: f.status,
          responsiblePerson: f.responsiblePerson,
        });
      }
    });

    complianceItems.forEach((c) => {
      if (c.dueDate) {
        const due = new Date(c.dueDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: c._id,
          title: c.complianceItem,
          category: 'Compliance Requirement',
          authority: c.category,
          dueDate: c.dueDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0 && c.status !== 'Completed',
          status: c.status,
          responsiblePerson: c.responsiblePerson,
        });
      }
    });

    agreements.forEach((a) => {
      if (a.endDate) {
        const due = new Date(a.endDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: a._id,
          title: a.agreementName,
          category: 'Agreement Expiration',
          authority: a.licensee,
          dueDate: a.endDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0 && a.status === 'Active',
          status: a.status,
          responsiblePerson: a.licensor,
        });
      }
    });

    patents.forEach((p) => {
      if (p.expiryDate) {
        const due = new Date(p.expiryDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: p._id,
          title: p.title,
          category: 'Patent Expiry',
          authority: p.jurisdiction,
          dueDate: p.expiryDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0,
          status: p.applicationStatus,
          responsiblePerson: (p.inventors && p.inventors[0]) || 'Lead Inventor',
        });
      }
    });

    deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Calculate milestone completion rate (0-100%)
    let milestoneScore = 20; // Base score for project initialization
    if (project.status === 'Completed') milestoneScore = 100;
    else {
      if (patents.length > 0) milestoneScore += 15;
      if (patentsGranted > 0) milestoneScore += 20;
      if (disclosuresApproved > 0) milestoneScore += 15;
      if (agreementsActive > 0) milestoneScore += 15;
      if (filingsApproved > 0) milestoneScore += 15;
      milestoneScore = Math.min(milestoneScore, 95);
    }

    const overviewData = {
      project,
      milestoneProgress: {
        score: milestoneScore,
        status: project.status,
        priority: project.priority,
      },
      counts: {
        patents: patents.length,
        patentsGranted,
        patentsFiled,
        disclosures: disclosures.length,
        disclosuresApproved,
        disclosuresPending,
        agreements: agreements.length,
        agreementsActive,
        filings: filings.length,
        filingsApproved,
        filingsPending,
        compliance: complianceItems.length,
        complianceCritical,
        compliancePending,
        collaborations: collaborations.length,
        documents: documents.length,
      },
      upcomingDeadlines: deadlines.slice(0, 8),
      recentActivity,
    };

    await cacheSet(cacheKey, overviewData, 120);

    res.status(200).json({
      success: true,
      ...overviewData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectPatents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = { project: id };
    if (status) filter.applicationStatus = status;
    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { patentNumber: { $regex: search, $options: 'i' } },
        { inventors: { $regex: search, $options: 'i' } },
        { jurisdiction: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const patents = await Patent.find(filter)
      .populate('technologyDisclosure', 'title disclosureId')
      .sort(sortOption);

    res.status(200).json({ success: true, count: patents.length, patents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectDisclosures = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, priority, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = { project: id };
    if (status) filter.reviewStatus = status;
    if (priority) filter.priority = priority;
    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { disclosureId: { $regex: search, $options: 'i' } },
        { inventor: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const disclosures = await TechnologyDisclosure.find(filter)
      .populate('convertedPatent', 'title patentNumber applicationStatus')
      .sort(sortOption);

    res.status(200).json({ success: true, count: disclosures.length, disclosures });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectAgreements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, agreementType, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = { project: id };
    if (status) filter.status = status;
    if (agreementType) filter.agreementType = agreementType;
    if (search && typeof search === 'string') {
      filter.$or = [
        { agreementName: { $regex: search, $options: 'i' } },
        { agreementId: { $regex: search, $options: 'i' } },
        { licensee: { $regex: search, $options: 'i' } },
        { licensor: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const agreements = await LicensingAgreement.find(filter)
      .populate('patent', 'title patentNumber')
      .sort(sortOption);

    res.status(200).json({ success: true, count: agreements.length, agreements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectFilings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, authority, search, sortBy = 'dueDate', order = 'asc' } = req.query;

    const filter: any = { project: id };
    if (status) filter.status = status;
    if (authority) filter.regulatoryAuthority = authority;
    if (search && typeof search === 'string') {
      filter.$or = [
        { filingName: { $regex: search, $options: 'i' } },
        { filingId: { $regex: search, $options: 'i' } },
        { regulatoryAuthority: { $regex: search, $options: 'i' } },
        { filingType: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const filings = await RegulatoryFiling.find(filter).sort(sortOption);

    res.status(200).json({ success: true, count: filings.length, filings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectCompliance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, riskLevel, category, search, sortBy = 'dueDate', order = 'asc' } = req.query;

    const filter: any = { project: id };
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (category) filter.category = category;
    if (search && typeof search === 'string') {
      filter.$or = [
        { complianceItem: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { responsiblePerson: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const items = await ComplianceItem.find(filter).sort(sortOption);

    res.status(200).json({ success: true, count: items.length, compliance: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectCollaborations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, collaborationType, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = { project: id };
    if (status) filter.status = status;
    if (collaborationType) filter.collaborationType = collaborationType;
    if (search && typeof search === 'string') {
      filter.$or = [
        { collaborationName: { $regex: search, $options: 'i' } },
        { collaborationId: { $regex: search, $options: 'i' } },
        { partnerOrganization: { $regex: search, $options: 'i' } },
        { leadResearcher: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy as string] = order === 'asc' ? 1 : -1;

    const collaborations = await ResearchCollaboration.find(filter).sort(sortOption);

    res.status(200).json({ success: true, count: collaborations.length, collaborations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectDeadlines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [filings, complianceItems, agreements, patents] = await Promise.all([
      RegulatoryFiling.find({ project: id }),
      ComplianceItem.find({ project: id }),
      LicensingAgreement.find({ project: id }),
      Patent.find({ project: id }),
    ]);

    const now = new Date();
    const deadlines: any[] = [];

    filings.forEach((f) => {
      if (f.dueDate) {
        const due = new Date(f.dueDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: f._id,
          title: f.filingName,
          code: f.filingId,
          itemType: 'Regulatory Filing',
          authority: f.regulatoryAuthority,
          type: f.filingType,
          dueDate: f.dueDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0 && f.status !== 'Approved',
          status: f.status,
          responsiblePerson: f.responsiblePerson,
        });
      }
    });

    complianceItems.forEach((c) => {
      if (c.dueDate) {
        const due = new Date(c.dueDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: c._id,
          title: c.complianceItem,
          code: c.category,
          itemType: 'Compliance Item',
          authority: c.category,
          type: c.riskLevel + ' Risk',
          dueDate: c.dueDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0 && c.status !== 'Completed',
          status: c.status,
          responsiblePerson: c.responsiblePerson,
        });
      }
    });

    agreements.forEach((a) => {
      if (a.endDate) {
        const due = new Date(a.endDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: a._id,
          title: a.agreementName,
          code: a.agreementId,
          itemType: 'Licensing Agreement',
          authority: a.licensee,
          type: a.agreementType,
          dueDate: a.endDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0 && a.status === 'Active',
          status: a.status,
          responsiblePerson: a.licensor,
        });
      }
    });

    patents.forEach((p) => {
      if (p.expiryDate) {
        const due = new Date(p.expiryDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: p._id,
          title: p.title,
          code: p.patentNumber,
          itemType: 'Patent Expiry',
          authority: p.jurisdiction,
          type: 'Maintenance / Expiry',
          dueDate: p.expiryDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0,
          status: p.applicationStatus,
          responsiblePerson: (p.inventors && p.inventors[0]) || 'Lead Inventor',
        });
      }
    });

    deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    res.status(200).json({
      success: true,
      count: deadlines.length,
      deadlines,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { search, documentType } = req.query;

    const filter: any = {
      $or: [{ project: id }, { relatedEntityType: 'Project', relatedEntityId: id }],
    };

    if (documentType) filter.documentType = documentType;
    if (search && typeof search === 'string') {
      filter.$and = [
        {
          $or: [
            { documentName: { $regex: search, $options: 'i' } },
            { documentType: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const documents = await DocumentRecord.find(filter).sort({ uploadDate: -1 });

    res.status(200).json({ success: true, count: documents.length, documents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 30 } = req.query;

    const activity = await ActivityLog.find({
      $or: [{ project: id }, { entityId: id, entityType: 'Project' }],
    })
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.status(200).json({ success: true, count: activity.length, activity });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      code,
      description,
      department,
      projectManager,
      projectManagerName,
      startDate,
      endDate,
      status,
      priority,
      teamMembers,
    } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, message: 'Project name and project code are required.' });
      return;
    }

    const existing = await Project.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      res.status(409).json({ success: false, message: `Project code "${code}" already exists.` });
      return;
    }

    const project = await Project.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || '',
      department: department?.trim() || 'Biotechnology R&D',
      projectManager: projectManager || null,
      projectManagerName: projectManagerName || req.user?.name || 'Dr. Alex Rivera',
      startDate: startDate || new Date(),
      endDate: endDate || null,
      status: status || 'Planning',
      priority: priority || 'Medium',
      teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
      createdBy: req.user?._id,
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_PROJECT',
      entityType: 'Project',
      entityId: project._id.toString(),
      project: project._id,
      details: `Created project "${project.name}" [${project.code}] in ${project.department}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:projects'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const fields = [
      'name',
      'code',
      'description',
      'department',
      'projectManager',
      'projectManagerName',
      'startDate',
      'endDate',
      'status',
      'priority',
      'teamMembers',
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        (project as any)[f] = req.body[f];
      }
    });

    if (req.body.code) {
      project.code = req.body.code.toUpperCase().trim();
    }

    await project.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_PROJECT',
      entityType: 'Project',
      entityId: project._id.toString(),
      project: project._id,
      details: `Updated project "${project.name}" [${project.code}] status: ${project.status}`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:projects'),
      cacheInvalidatePrefix(`cache:project:${id}`),
    ]);

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_PROJECT',
      entityType: 'Project',
      entityId: id,
      details: `Deleted project "${project.name}" [${project.code}]`,
    });

    await Promise.all([
      invalidateAllDashboardCaches(),
      cacheInvalidatePrefix('cache:projects'),
      cacheInvalidatePrefix(`cache:project:${id}`),
    ]);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
