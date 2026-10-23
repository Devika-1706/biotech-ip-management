import { Response } from 'express';
import { Patent } from '../models/Patent';
import { RegulatoryFiling } from '../models/RegulatoryFiling';
import { ComplianceItem } from '../models/ComplianceItem';
import { LicensingAgreement } from '../models/LicensingAgreement';
import { Project } from '../models/Project';
import { AuthRequest } from '../middleware/auth';
import { cacheGet, cacheSet } from '../config/redis';

export interface DeadlineItem {
  id: string;
  title: string;
  category: 'Patent Expiry' | 'Regulatory Filing' | 'Compliance Item' | 'Licensing Agreement' | 'Project Milestone';
  dueDate: Date;
  status: string;
  priority?: string;
  entityType: string;
  projectName?: string;
  daysRemaining: number;
  urgency: 'overdue' | 'dueToday' | 'dueThisWeek' | 'upcoming';
}

export const getDeadlines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = 'stats:deadlines';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, fromCache: true, ...cached });
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOf90Days = new Date(startOfToday.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [patents, filings, compliance, agreements, projects] = await Promise.all([
      Patent.find({
        expiryDate: { $exists: true, $ne: null },
        applicationStatus: { $nin: ['Expired', 'Draft'] },
      }).populate('project', 'name code'),

      RegulatoryFiling.find({
        dueDate: { $exists: true, $ne: null },
        status: { $nin: ['Approved', 'Rejected'] },
      }).populate('project', 'name code'),

      ComplianceItem.find({
        dueDate: { $exists: true, $ne: null },
        status: { $ne: 'Completed' },
      }).populate('project', 'name code'),

      LicensingAgreement.find({
        endDate: { $exists: true, $ne: null },
        status: { $in: ['Active', 'Negotiation'] },
      }).populate('project', 'name code'),

      Project.find({
        endDate: { $exists: true, $ne: null },
        status: { $in: ['Active', 'Planning'] },
      }),
    ]);

    const allDeadlines: DeadlineItem[] = [];

    const processItem = (
      id: string,
      title: string,
      category: DeadlineItem['category'],
      date: Date,
      status: string,
      entityType: string,
      priority?: string,
      projectName?: string
    ) => {
      const dueDate = new Date(date);
      const diffTime = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let urgency: DeadlineItem['urgency'] = 'upcoming';
      if (dueDate < startOfToday) {
        urgency = 'overdue';
      } else if (dueDate <= endOfToday) {
        urgency = 'dueToday';
      } else if (dueDate <= endOfWeek) {
        urgency = 'dueThisWeek';
      }

      allDeadlines.push({
        id,
        title,
        category,
        dueDate,
        status,
        priority: priority || 'Medium',
        entityType,
        projectName,
        daysRemaining,
        urgency,
      });
    };

    patents.forEach((p) => {
      if (p.expiryDate) {
        processItem(
          p._id.toString(),
          `${p.title} (${p.patentNumber})`,
          'Patent Expiry',
          p.expiryDate,
          p.applicationStatus,
          'Patent',
          'High',
          (p.project as any)?.name
        );
      }
    });

    filings.forEach((f) => {
      if (f.dueDate) {
        processItem(
          f._id.toString(),
          `${f.filingName} [${f.regulatoryAuthority}]`,
          'Regulatory Filing',
          f.dueDate,
          f.status,
          'RegulatoryFiling',
          'Critical',
          (f.project as any)?.name
        );
      }
    });

    compliance.forEach((c) => {
      if (c.dueDate) {
        processItem(
          c._id.toString(),
          c.complianceItem,
          'Compliance Item',
          c.dueDate,
          c.status,
          'ComplianceItem',
          c.riskLevel,
          (c.project as any)?.name
        );
      }
    });

    agreements.forEach((a) => {
      if (a.endDate) {
        processItem(
          a._id.toString(),
          `${a.agreementName} (${a.licensee})`,
          'Licensing Agreement',
          a.endDate,
          a.status,
          'LicensingAgreement',
          'Medium',
          (a.project as any)?.name
        );
      }
    });

    projects.forEach((prj) => {
      if (prj.endDate) {
        processItem(
          prj._id.toString(),
          `Project Target: ${prj.name}`,
          'Project Milestone',
          prj.endDate,
          prj.status,
          'Project',
          prj.priority,
          prj.name
        );
      }
    });

    // Sort by dueDate ascending
    allDeadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const summary = {
      total: allDeadlines.length,
      overdueCount: allDeadlines.filter((d) => d.urgency === 'overdue').length,
      dueTodayCount: allDeadlines.filter((d) => d.urgency === 'dueToday').length,
      dueThisWeekCount: allDeadlines.filter((d) => d.urgency === 'dueThisWeek').length,
      upcomingCount: allDeadlines.filter((d) => d.urgency === 'upcoming').length,
    };

    const grouped = {
      overdue: allDeadlines.filter((d) => d.urgency === 'overdue'),
      dueToday: allDeadlines.filter((d) => d.urgency === 'dueToday'),
      dueThisWeek: allDeadlines.filter((d) => d.urgency === 'dueThisWeek'),
      upcoming: allDeadlines.filter((d) => d.urgency === 'upcoming'),
    };

    const responsePayload = {
      summary,
      grouped,
      allDeadlines,
    };

    await cacheSet(cacheKey, responsePayload, 120);

    res.status(200).json({
      success: true,
      ...responsePayload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
