import { Response } from 'express';
import { Project } from '../models/Project';
import { Patent } from '../models/Patent';
import { TechnologyDisclosure } from '../models/TechnologyDisclosure';
import { LicensingAgreement } from '../models/LicensingAgreement';
import { RegulatoryFiling } from '../models/RegulatoryFiling';
import { ComplianceItem } from '../models/ComplianceItem';
import { ResearchCollaboration } from '../models/ResearchCollaboration';
import { AuthRequest } from '../middleware/auth';
import { cacheGet, cacheSet } from '../config/redis';

export const getReportsData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = 'stats:reports';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, fromCache: true, ...cached });
      return;
    }

    const [
      patentsByStatus,
      patentsByJurisdiction,
      projectsByStatus,
      projectsByDepartment,
      projectsByPriority,
      complianceByStatus,
      complianceByRisk,
      complianceByCategory,
      filingsByAuthority,
      filingsByStatus,
      filingsByType,
      agreementsByStatus,
      agreementsByType,
      collaborationsByStatus,
      collaborationsByType,
      disclosuresByStatus,
    ] = await Promise.all([
      Patent.aggregate([{ $group: { _id: '$applicationStatus', count: { $sum: 1 } } }]),
      Patent.aggregate([{ $group: { _id: '$jurisdiction', count: { $sum: 1 } } }]),
      Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Project.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
      Project.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      ComplianceItem.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ComplianceItem.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
      ComplianceItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      RegulatoryFiling.aggregate([{ $group: { _id: '$regulatoryAuthority', count: { $sum: 1 } } }]),
      RegulatoryFiling.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      RegulatoryFiling.aggregate([{ $group: { _id: '$filingType', count: { $sum: 1 } } }]),
      LicensingAgreement.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      LicensingAgreement.aggregate([{ $group: { _id: '$agreementType', count: { $sum: 1 } } }]),
      ResearchCollaboration.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ResearchCollaboration.aggregate([{ $group: { _id: '$collaborationType', count: { $sum: 1 } } }]),
      TechnologyDisclosure.aggregate([{ $group: { _id: '$reviewStatus', count: { $sum: 1 } } }]),
    ]);

    const reportPayload = {
      patents: {
        byStatus: patentsByStatus,
        byJurisdiction: patentsByJurisdiction,
      },
      projects: {
        byStatus: projectsByStatus,
        byDepartment: projectsByDepartment,
        byPriority: projectsByPriority,
      },
      compliance: {
        byStatus: complianceByStatus,
        byRisk: complianceByRisk,
        byCategory: complianceByCategory,
      },
      filings: {
        byAuthority: filingsByAuthority,
        byStatus: filingsByStatus,
        byType: filingsByType,
      },
      agreements: {
        byStatus: agreementsByStatus,
        byType: agreementsByType,
      },
      collaborations: {
        byStatus: collaborationsByStatus,
        byType: collaborationsByType,
      },
      disclosures: {
        byStatus: disclosuresByStatus,
      },
    };

    await cacheSet(cacheKey, reportPayload, 120);

    res.status(200).json({
      success: true,
      ...reportPayload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
