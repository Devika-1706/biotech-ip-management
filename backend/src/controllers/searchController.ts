import { Response } from 'express';
import { Project } from '../models/Project';
import { Patent } from '../models/Patent';
import { TechnologyDisclosure } from '../models/TechnologyDisclosure';
import { LicensingAgreement } from '../models/LicensingAgreement';
import { RegulatoryFiling } from '../models/RegulatoryFiling';
import { ComplianceItem } from '../models/ComplianceItem';
import { ResearchCollaboration } from '../models/ResearchCollaboration';
import { AuthRequest } from '../middleware/auth';

export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length === 0) {
      res.status(200).json({
        success: true,
        query: '',
        totalResults: 0,
        results: {
          projects: [],
          patents: [],
          disclosures: [],
          agreements: [],
          filings: [],
          compliance: [],
          collaborations: [],
        },
      });
      return;
    }

    const regex = new RegExp(q.trim(), 'i');

    const [projects, patents, disclosures, agreements, filings, compliance, collaborations] = await Promise.all([
      Project.find({
        $or: [{ name: regex }, { code: regex }, { department: regex }, { description: regex }],
      })
        .limit(6)
        .select('name code department status priority'),

      Patent.find({
        $or: [{ title: regex }, { patentNumber: regex }, { inventors: regex }, { jurisdiction: regex }],
      })
        .limit(6)
        .select('title patentNumber applicationStatus jurisdiction'),

      TechnologyDisclosure.find({
        $or: [{ title: regex }, { disclosureId: regex }, { inventor: regex }, { description: regex }],
      })
        .limit(6)
        .select('title disclosureId reviewStatus inventor priority'),

      LicensingAgreement.find({
        $or: [{ agreementName: regex }, { agreementId: regex }, { licensee: regex }, { licensor: regex }],
      })
        .limit(6)
        .select('agreementName agreementId licensee status endDate'),

      RegulatoryFiling.find({
        $or: [{ filingName: regex }, { filingId: regex }, { regulatoryAuthority: regex }, { filingType: regex }],
      })
        .limit(6)
        .select('filingName filingId regulatoryAuthority status dueDate'),

      ComplianceItem.find({
        $or: [{ complianceItem: regex }, { category: regex }, { responsiblePerson: regex }],
      })
        .limit(6)
        .select('complianceItem category status riskLevel dueDate'),

      ResearchCollaboration.find({
        $or: [{ collaborationName: regex }, { collaborationId: regex }, { partnerOrganization: regex }, { leadResearcher: regex }],
      })
        .limit(6)
        .select('collaborationName collaborationId partnerOrganization status'),
    ]);

    const totalResults =
      projects.length +
      patents.length +
      disclosures.length +
      agreements.length +
      filings.length +
      compliance.length +
      collaborations.length;

    res.status(200).json({
      success: true,
      query: q,
      totalResults,
      results: {
        projects,
        patents,
        disclosures,
        agreements,
        filings,
        compliance,
        collaborations,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
