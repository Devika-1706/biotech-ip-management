import { Response } from 'express';
import { Project } from '../models/Project';
import { Patent } from '../models/Patent';
import { TechnologyDisclosure } from '../models/TechnologyDisclosure';
import { LicensingAgreement } from '../models/LicensingAgreement';
import { RegulatoryFiling } from '../models/RegulatoryFiling';
import { ComplianceItem } from '../models/ComplianceItem';
import { ResearchCollaboration } from '../models/ResearchCollaboration';
import { ActivityLog } from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { cacheGet, cacheSet } from '../config/redis';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = 'stats:dashboard';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, fromCache: true, ...cached });
      return;
    }

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalProjects,
      activeProjects,
      totalPatents,
      grantedPatents,
      activeDisclosures,
      activeAgreements,
      pendingFilings,
      totalCompliance,
      overdueCompliance,
      activeCollaborations,
      recentActivities,
      patentsByStatus,
      disclosuresByStatus,
      complianceByStatus,
      complianceByRisk,
      upcomingDeadlinesPatents,
      upcomingDeadlinesFilings,
      upcomingDeadlinesCompliance,
      upcomingDeadlinesAgreements,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'Active' }),
      Patent.countDocuments(),
      Patent.countDocuments({ applicationStatus: 'Granted' }),
      TechnologyDisclosure.countDocuments({ reviewStatus: { $in: ['Submitted', 'Under Review', 'Approved'] } }),
      LicensingAgreement.countDocuments({ status: 'Active' }),
      RegulatoryFiling.countDocuments({ status: { $in: ['Draft', 'Prepared', 'Submitted', 'Under Review'] } }),
      ComplianceItem.countDocuments(),
      ComplianceItem.countDocuments({
        $or: [{ status: 'Overdue' }, { status: { $ne: 'Completed' }, dueDate: { $lt: now } }],
      }),
      ResearchCollaboration.countDocuments({ status: 'Active' }),
      ActivityLog.find().sort({ timestamp: -1 }).limit(10),

      // Groupings for charts
      Patent.aggregate([{ $group: { _id: '$applicationStatus', count: { $sum: 1 } } }]),
      TechnologyDisclosure.aggregate([{ $group: { _id: '$reviewStatus', count: { $sum: 1 } } }]),
      ComplianceItem.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ComplianceItem.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),

      // Count deadlines within next 30 days
      Patent.countDocuments({
        expiryDate: { $gte: now, $lte: thirtyDaysLater },
        applicationStatus: { $nin: ['Expired', 'Draft'] },
      }),
      RegulatoryFiling.countDocuments({
        dueDate: { $gte: now, $lte: thirtyDaysLater },
        status: { $nin: ['Approved', 'Rejected'] },
      }),
      ComplianceItem.countDocuments({
        dueDate: { $gte: now, $lte: thirtyDaysLater },
        status: { $ne: 'Completed' },
      }),
      LicensingAgreement.countDocuments({
        endDate: { $gte: now, $lte: thirtyDaysLater },
        status: { $in: ['Active', 'Negotiation'] },
      }),
    ]);

    const upcomingDeadlinesCount =
      upcomingDeadlinesPatents +
      upcomingDeadlinesFilings +
      upcomingDeadlinesCompliance +
      upcomingDeadlinesAgreements;

    // Structure charts
    const lifecycleChart = {
      labels: ['Disclosures', 'Under Review', 'Patents Filed', 'Patents Granted', 'Active Licenses'],
      data: [
        disclosuresByStatus.find((d) => d._id === 'Submitted')?.count || 0,
        disclosuresByStatus.find((d) => d._id === 'Under Review')?.count || 0,
        patentsByStatus.find((p) => p._id === 'Filed' || p._id === 'Under Examination')?.count || 0,
        grantedPatents,
        activeAgreements,
      ],
    };

    const payload = {
      summary: {
        totalProjects,
        activeProjects,
        totalPatents,
        grantedPatents,
        activeDisclosures,
        activeAgreements,
        pendingFilings,
        totalCompliance,
        overdueCompliance,
        activeCollaborations,
        upcomingDeadlines: upcomingDeadlinesCount,
      },
      charts: {
        lifecycleChart,
        patentsByStatus,
        disclosuresByStatus,
        complianceByStatus,
        complianceByRisk,
      },
      recentActivities,
    };

    await cacheSet(cacheKey, payload, 120);

    res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
