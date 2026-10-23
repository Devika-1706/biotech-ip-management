export type UserRole = 'ADMIN' | 'IP MANAGER' | 'RESEARCHER';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive?: boolean;
  createdAt?: string;
}

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Project {
  _id: string;
  name: string;
  code: string;
  description: string;
  department: string;
  projectManager?: any;
  projectManagerName?: string;
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  teamMembers?: string[];
  counts?: {
    patents: number;
    disclosures: number;
    agreements: number;
    filings: number;
    compliance: number;
    collaborations: number;
    documents: number;
  };
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PatentStatus = 'Draft' | 'Filed' | 'Under Examination' | 'Granted' | 'Rejected' | 'Expired';

export interface Patent {
  _id: string;
  title: string;
  patentNumber: string;
  inventors: string[];
  project: Project | { _id: string; name: string; code: string; department?: string };
  filingDate: string;
  priorityDate?: string;
  applicationStatus: PatentStatus;
  jurisdiction: string;
  owner: string;
  expiryDate?: string;
  description: string;
  technologyDisclosure?: any;
  createdAt: string;
  updatedAt: string;
}

export type DisclosureStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Converted to Patent';
export type DisclosurePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TechnologyDisclosure {
  _id: string;
  title: string;
  disclosureId: string;
  inventor: string;
  project: Project | { _id: string; name: string; code: string; department?: string };
  description: string;
  submissionDate: string;
  reviewStatus: DisclosureStatus;
  reviewer?: string;
  priority: DisclosurePriority;
  decision?: string;
  convertedPatent?: any;
  createdAt: string;
  updatedAt: string;
}

export type AgreementStatus = 'Draft' | 'Negotiation' | 'Active' | 'Expired' | 'Terminated';

export interface LicensingAgreement {
  _id: string;
  agreementName: string;
  agreementId: string;
  patent?: Patent | { _id: string; title: string; patentNumber: string };
  project?: Project | { _id: string; name: string; code: string };
  licensee: string;
  licensor: string;
  agreementType: string;
  startDate: string;
  endDate: string;
  royaltyInfo: string;
  status: AgreementStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type FilingStatus = 'Draft' | 'Prepared' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

export interface RegulatoryFiling {
  _id: string;
  filingName: string;
  filingId: string;
  project: Project | { _id: string; name: string; code: string };
  regulatoryAuthority: string;
  filingType: string;
  submissionDate?: string;
  dueDate: string;
  status: FilingStatus;
  responsiblePerson: string;
  description: string;
  isOverdue?: boolean;
  isUpcoming?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ComplianceStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
export type ComplianceRisk = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ComplianceItem {
  _id: string;
  complianceItem: string;
  category: string;
  project: Project | { _id: string; name: string; code: string };
  responsiblePerson: string;
  dueDate: string;
  status: ComplianceStatus;
  riskLevel: ComplianceRisk;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type CollaborationStatus = 'Proposed' | 'Active' | 'Completed' | 'Terminated';

export interface ResearchCollaboration {
  _id: string;
  collaborationName: string;
  collaborationId: string;
  project: Project | { _id: string; name: string; code: string };
  partnerOrganization: string;
  leadResearcher: string;
  startDate: string;
  endDate?: string;
  collaborationType: string;
  status: CollaborationStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type RelatedEntityType =
  | 'Project'
  | 'Patent'
  | 'TechnologyDisclosure'
  | 'LicensingAgreement'
  | 'RegulatoryFiling'
  | 'ComplianceItem'
  | 'ResearchCollaboration'
  | 'General';

export interface DocumentRecord {
  _id: string;
  documentName: string;
  documentType: string;
  relatedEntityType: RelatedEntityType;
  relatedEntityId?: string;
  relatedEntityName?: string;
  project?: any;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  uploaderName?: string;
  uploadDate: string;
  description: string;
  createdAt: string;
}

export interface ActivityLogItem {
  _id: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  project?: any;
  details: string;
  timestamp: string;
}

export interface ProjectOverviewData {
  project: Project;
  milestoneProgress: {
    score: number;
    status: ProjectStatus;
    priority: ProjectPriority;
  };
  counts: {
    patents: number;
    patentsGranted: number;
    patentsFiled: number;
    disclosures: number;
    disclosuresApproved: number;
    disclosuresPending: number;
    agreements: number;
    agreementsActive: number;
    filings: number;
    filingsApproved: number;
    filingsPending: number;
    compliance: number;
    complianceCritical: number;
    compliancePending: number;
    collaborations: number;
    documents: number;
  };
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    category: string;
    authority?: string;
    dueDate: string;
    daysRemaining: number;
    isOverdue: boolean;
    status: string;
    responsiblePerson?: string;
  }>;
  recentActivity: ActivityLogItem[];
  fromCache?: boolean;
}

export interface ProjectDeadlineItem {
  id: string;
  title: string;
  code: string;
  itemType: 'Regulatory Filing' | 'Compliance Item' | 'Licensing Agreement' | 'Patent Expiry';
  authority: string;
  type: string;
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean;
  status: string;
  responsiblePerson: string;
}

export interface DeadlineItem {
  id: string;
  title: string;
  category: 'Patent Expiry' | 'Regulatory Filing' | 'Compliance Item' | 'Licensing Agreement' | 'Project Milestone';
  dueDate: string;
  status: string;
  priority?: string;
  entityType: string;
  projectName?: string;
  daysRemaining: number;
  urgency: 'overdue' | 'dueToday' | 'dueThisWeek' | 'upcoming';
}

export interface DashboardStats {
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalPatents: number;
    grantedPatents: number;
    activeDisclosures: number;
    activeAgreements: number;
    pendingFilings: number;
    totalCompliance: number;
    overdueCompliance: number;
    activeCollaborations: number;
    upcomingDeadlines: number;
  };
  charts: {
    lifecycleChart: {
      labels: string[];
      data: number[];
    };
    patentsByStatus: { _id: string; count: number }[];
    disclosuresByStatus: { _id: string; count: number }[];
    complianceByStatus: { _id: string; count: number }[];
    complianceByRisk: { _id: string; count: number }[];
  };
  recentActivities: ActivityLogItem[];
  fromCache?: boolean;
}

export interface ReportsData {
  patents: {
    byStatus: { _id: string; count: number }[];
    byJurisdiction: { _id: string; count: number }[];
  };
  projects: {
    byStatus: { _id: string; count: number }[];
    byDepartment: { _id: string; count: number }[];
    byPriority: { _id: string; count: number }[];
  };
  compliance: {
    byStatus: { _id: string; count: number }[];
    byRisk: { _id: string; count: number }[];
    byCategory: { _id: string; count: number }[];
  };
  filings: {
    byAuthority: { _id: string; count: number }[];
    byStatus: { _id: string; count: number }[];
    byType: { _id: string; count: number }[];
  };
  agreements: {
    byStatus: { _id: string; count: number }[];
    byType: { _id: string; count: number }[];
  };
  collaborations: {
    byStatus: { _id: string; count: number }[];
    byType: { _id: string; count: number }[];
  };
  disclosures: {
    byStatus: { _id: string; count: number }[];
  };
  fromCache?: boolean;
}
