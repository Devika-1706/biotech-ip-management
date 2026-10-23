import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Patent } from '../models/Patent';
import { TechnologyDisclosure } from '../models/TechnologyDisclosure';
import { LicensingAgreement } from '../models/LicensingAgreement';
import { RegulatoryFiling } from '../models/RegulatoryFiling';
import { ComplianceItem } from '../models/ComplianceItem';
import { ResearchCollaboration } from '../models/ResearchCollaboration';
import { DocumentRecord } from '../models/Document';
import { ActivityLog } from '../models/ActivityLog';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/biotech_ip_platform';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected. Purging existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Patent.deleteMany({}),
      TechnologyDisclosure.deleteMany({}),
      LicensingAgreement.deleteMany({}),
      RegulatoryFiling.deleteMany({}),
      ComplianceItem.deleteMany({}),
      ResearchCollaboration.deleteMany({}),
      DocumentRecord.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    console.log('[Seed] Inserting Demo Users...');
    // Create Users (passwords hashed by pre-save hook)
    const adminUser = await User.create({
      name: 'Dr. Eleanor Vance',
      email: 'admin@biotech-ip.com',
      password: 'Password123!',
      role: 'ADMIN',
      department: 'Executive IP Governance & Legal',
      isActive: true,
    });

    const ipManagerUser = await User.create({
      name: 'Marcus Holloway, Esq.',
      email: 'manager@biotech-ip.com',
      password: 'Password123!',
      role: 'IP MANAGER',
      department: 'Intellectual Property Portfolio Management',
      isActive: true,
    });

    const researcherUser = await User.create({
      name: 'Dr. Sarah Lin',
      email: 'researcher@biotech-ip.com',
      password: 'Password123!',
      role: 'RESEARCHER',
      department: 'Translational Genomics & Cell Engineering',
      isActive: true,
    });

    console.log('[Seed] Inserting Biotechnology Projects...');
    // 1. Projects
    const project1 = await Project.create({
      name: 'CRISPR-CasX Precision Epigenetic Editing for Sickle Cell Disease',
      code: 'PRJ-CRISPR-01',
      description: 'Next-generation ultra-compact CasX RNA-guided endonuclease platform for non-viral in vivo epigenetic silencing without double-stranded DNA breaks.',
      department: 'Gene Therapy',
      projectManager: ipManagerUser._id,
      projectManagerName: 'Marcus Holloway, Esq.',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2027-06-30'),
      status: 'Active',
      priority: 'Critical',
      createdBy: adminUser._id,
    });

    const project2 = await Project.create({
      name: 'Targeted Ionizable Lipid Nanoparticle (LNP) for mRNA Solid Tumor Delivery',
      code: 'PRJ-MRNA-02',
      description: 'Novel biodegradable PEGylated lipid formulations conjugated with HER2/EGFR dual-targeting scFv for liver-sparing systemic mRNA delivery.',
      department: 'Oncology Therapeutics',
      projectManager: adminUser._id,
      projectManagerName: 'Dr. Eleanor Vance',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2026-12-15'),
      status: 'Active',
      priority: 'High',
      createdBy: adminUser._id,
    });

    const project3 = await Project.create({
      name: 'Allogeneic Dual-Specific CAR-NK Cell Platform targeting BCMA/CD19',
      code: 'PRJ-CARNK-03',
      description: 'Off-the-shelf cord blood derived Natural Killer cell engineering with CRISPR knockout of inhibitory checkpoints (CBLB/NKG2A) for relapsed multiple myeloma.',
      department: 'Immunotherapy',
      projectManager: ipManagerUser._id,
      projectManagerName: 'Marcus Holloway, Esq.',
      startDate: new Date('2023-09-01'),
      endDate: new Date('2026-10-31'),
      status: 'Active',
      priority: 'High',
      createdBy: adminUser._id,
    });

    const project4 = await Project.create({
      name: 'Conformation-Selective Humanized Monoclonal Antibody against Amyloid-Beta Oligomers',
      code: 'PRJ-NEURO-04',
      description: 'Engineered IgG1 mAb with Fc-silencing mutations designed for selective neutralization of neurotoxic soluble Abeta oligomers with reduced ARIA risk.',
      department: 'Neurobiology',
      projectManager: adminUser._id,
      projectManagerName: 'Dr. Eleanor Vance',
      startDate: new Date('2025-01-10'),
      endDate: new Date('2028-04-30'),
      status: 'Planning',
      priority: 'Medium',
      createdBy: adminUser._id,
    });

    const project5 = await Project.create({
      name: 'Engineered Synthetic Microbes for Continuous In Situ Biosurfactant Production',
      code: 'PRJ-SYNBI-05',
      description: 'Metabolic engineering of Pseudomonas putida chassis for bio-based production of rhamnolipid congeners from lignocellulosic hydrolysates.',
      department: 'Synthetic Biology',
      projectManager: ipManagerUser._id,
      projectManagerName: 'Marcus Holloway, Esq.',
      startDate: new Date('2022-05-01'),
      endDate: new Date('2025-06-30'),
      status: 'Completed',
      priority: 'Low',
      createdBy: adminUser._id,
    });

    console.log('[Seed] Inserting Patents...');
    // 2. Patents
    const patent1 = await Patent.create({
      title: 'Engineered CasX Endonuclease Variants Having Enhanced Target DNA Cleavage Efficiency and Reduced Off-Target Cleavage',
      patentNumber: 'US-11849204-B2',
      inventors: ['Dr. Sarah Lin', 'Dr. Aris Thorne', 'Marcus Holloway'],
      project: project1._id,
      filingDate: new Date('2023-02-14'),
      priorityDate: new Date('2022-03-01'),
      applicationStatus: 'Granted',
      jurisdiction: 'USPTO (US)',
      owner: 'BioVault Therapeutics Inc.',
      expiryDate: new Date('2043-02-14'),
      description: 'Compositions of synthetic CasX nucleases with enhanced thermo-stability and high catalytic activity at physiological human body temperature.',
      createdBy: ipManagerUser._id,
    });

    const patent2 = await Patent.create({
      title: 'Ionizable Amino Lipids Comprising Branched Tertiary Amines for Nucleic Acid Nanoparticle Encapsulation',
      patentNumber: 'EP-3891240-A1',
      inventors: ['Dr. David Kowalski', 'Dr. Sarah Lin'],
      project: project2._id,
      filingDate: new Date('2023-11-20'),
      priorityDate: new Date('2022-12-05'),
      applicationStatus: 'Under Examination',
      jurisdiction: 'EPO (Europe)',
      owner: 'BioVault Therapeutics Inc.',
      expiryDate: new Date('2043-11-20'),
      description: 'Novel lipid structures providing >95% encapsulation efficiency of therapeutic mRNA payloads with reduced hepatic clearance and low immunogenicity.',
      createdBy: ipManagerUser._id,
    });

    const patent3 = await Patent.create({
      title: 'Genetically Modified Natural Killer Cells Deficient in CBL-B and Methods of Producing Same',
      patentNumber: 'WO-2024-041920-PCT',
      inventors: ['Dr. Sarah Lin', 'Dr. Kenji Sato'],
      project: project3._id,
      filingDate: new Date('2024-04-10'),
      priorityDate: new Date('2023-05-12'),
      applicationStatus: 'Filed',
      jurisdiction: 'WIPO (PCT)',
      owner: 'BioVault Therapeutics Inc.',
      expiryDate: new Date('2044-04-10'),
      description: 'Methods for high-efficiency dual CRISPR-Cas12a editing of primary allogeneic cord blood NK cells for cryopreserved allogeneic cell banks.',
      createdBy: ipManagerUser._id,
    });

    const patent4 = await Patent.create({
      title: 'Humanized Monoclonal Antibodies Specifically Binding to Soluble High-Molecular Weight Protofibrils',
      patentNumber: 'JP-2024-51042-B',
      inventors: ['Dr. Eleanor Vance', 'Dr. Christian Meyer'],
      project: project4._id,
      filingDate: new Date('2025-02-18'),
      priorityDate: new Date('2024-03-10'),
      applicationStatus: 'Draft',
      jurisdiction: 'JPO (Japan)',
      owner: 'BioVault Therapeutics Inc.',
      expiryDate: new Date('2045-02-18'),
      description: 'Specific paratope sequences conferring >1000-fold binding selectivity over monomeric peptide forms.',
      createdBy: ipManagerUser._id,
    });

    console.log('[Seed] Inserting Technology Disclosures...');
    // 3. Technology Disclosures
    const td1 = await TechnologyDisclosure.create({
      title: 'High-Density Enzymatic Synthesis of Modified Nucleosides for Long-Circulating In Vivo RNA Therapeutics',
      disclosureId: 'TD-2026-081',
      inventor: 'Dr. Sarah Lin',
      project: project2._id,
      description: 'A biocatalytic cell-free cascade using engineered thermophilic nucleoside phosphorylases yielding 99.4% diastereomeric purity of N1-methylpseudouridine analogs.',
      submissionDate: new Date('2026-01-20'),
      reviewStatus: 'Approved',
      reviewer: 'Marcus Holloway, Esq.',
      priority: 'High',
      decision: 'Approved by Patent Committee. Fast-track patent drafting authorized.',
      createdBy: researcherUser._id,
    });

    const td2 = await TechnologyDisclosure.create({
      title: 'Transient Multiplex Electroporation Pipeline for Non-Viral Insertion of 12kb Synthetic Transgene Cassettes',
      disclosureId: 'TD-2026-082',
      inventor: 'Dr. Sarah Lin',
      project: project3._id,
      description: 'Waveform optimization protocol using microfluidic hydro-poration allowing 80% viability and 45% knock-in rate in resting human T and NK cells.',
      submissionDate: new Date('2026-02-10'),
      reviewStatus: 'Under Review',
      reviewer: 'IP Review Committee',
      priority: 'Critical',
      decision: 'Initial prior art evaluation reveals strong patentability. FTO search underway.',
      createdBy: researcherUser._id,
    });

    const td3 = await TechnologyDisclosure.create({
      title: 'Continuous High-Titer Perfusion Bioreactor Controller with Machine-Learning Dissolved Oxygen Regulation',
      disclosureId: 'TD-2026-083',
      inventor: 'Dr. Eleanor Vance',
      project: project4._id,
      description: 'Adaptive closed-loop feedback controller based on Raman spectroscopic monitoring for constant monoclonal antibody glycosylation profiles.',
      submissionDate: new Date('2026-02-28'),
      reviewStatus: 'Submitted',
      reviewer: 'Marcus Holloway, Esq.',
      priority: 'Medium',
      decision: '',
      createdBy: researcherUser._id,
    });

    const td4 = await TechnologyDisclosure.create({
      title: 'Engineered Self-Inactivating Guide RNA Hairpins for High-Fidelity CasX Gene Disruption',
      disclosureId: 'TD-2025-044',
      inventor: 'Dr. Sarah Lin',
      project: project1._id,
      description: 'Self-cleaving ribozyme-flanked sgRNA constructs limiting intracellular active enzyme persistence to under 4 hours.',
      submissionDate: new Date('2025-06-15'),
      reviewStatus: 'Converted to Patent',
      reviewer: 'Marcus Holloway, Esq.',
      priority: 'Critical',
      decision: 'Successfully converted to Patent Application US-11849204-B2',
      convertedPatent: patent1._id,
      createdBy: researcherUser._id,
    });

    console.log('[Seed] Inserting Licensing Agreements...');
    // 4. Licensing Agreements
    await LicensingAgreement.create({
      agreementName: 'Global Commercial Co-Development & Exclusive License for CasX Oncology Indications',
      agreementId: 'LA-2025-009',
      patent: patent1._id,
      project: project1._id,
      licensee: 'Novartis Gene Therapies AG',
      licensor: 'BioVault Therapeutics Inc.',
      agreementType: 'Exclusive Commercial License',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2035-12-31'),
      royaltyInfo: '6.5% Net Global Sales + $25M upfront + up to $180M in clinical/commercial milestones',
      status: 'Active',
      description: 'Novartis receives worldwide rights for all ex-vivo oncology applications utilizing BioVault CasX endonuclease variations.',
      createdBy: ipManagerUser._id,
    });

    await LicensingAgreement.create({
      agreementName: 'Non-Exclusive Research Evaluation License for Synthetic Ionizable Lipids',
      agreementId: 'LA-2026-015',
      patent: patent2._id,
      project: project2._id,
      licensee: 'Genentech / Roche Bioscience',
      licensor: 'BioVault Therapeutics Inc.',
      agreementType: 'Non-Exclusive License',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-01-31'),
      royaltyInfo: '$1.5M annual research access fee with pre-negotiated commercial option terms',
      status: 'Active',
      description: 'Evaluation agreement granting Genentech rights to test BioVault LNP formulations in preclinical pulmonary delivery models.',
      createdBy: ipManagerUser._id,
    });

    await LicensingAgreement.create({
      agreementName: 'Cross-Licensing and Material Transfer Agreement for Pre-clinical CAR Constructs',
      agreementId: 'LA-2026-019',
      patent: patent3._id,
      project: project3._id,
      licensee: 'Takeda Oncology Inc.',
      licensor: 'BioVault Therapeutics Inc.',
      agreementType: 'Cross-License',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-08-30'),
      royaltyInfo: 'Reciprocal royalty-free access to scFv binder library during initial preclinical phase',
      status: 'Negotiation',
      description: 'Mutual exchange of patent claims covering synthetic human scFv antibody binding fragments.',
      createdBy: ipManagerUser._id,
    });

    console.log('[Seed] Inserting Regulatory Filings...');
    // 5. Regulatory Filings (with upcoming / overdue deadlines)
    const now = new Date();
    const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const in25Days = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
    const past5Days = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    await RegulatoryFiling.create({
      filingName: 'Investigational New Drug (IND) Application: BV-CasX-101 in Severe Sickle Cell Disease',
      filingId: 'REG-FDA-IND-7704',
      project: project1._id,
      regulatoryAuthority: 'FDA (United States)',
      filingType: 'IND (Investigational New Drug)',
      submissionDate: new Date('2025-11-15'),
      dueDate: in10Days, // Upcoming soon!
      status: 'Under Review',
      responsiblePerson: 'Dr. Eleanor Vance',
      description: 'FDA Center for Biologics Evaluation and Research (CBER) submission covering safety pharmacology, toxicology, and Phase 1 trial design.',
      createdBy: adminUser._id,
    });

    await RegulatoryFiling.create({
      filingName: 'Clinical Trial Authorization (CTA) Dossier for Phase 1b Dose Escalation of BV-LNP-02',
      filingId: 'REG-EMA-CTA-4412',
      project: project2._id,
      regulatoryAuthority: 'EMA (European Union)',
      filingType: 'CTA (Clinical Trial Authorization)',
      submissionDate: null,
      dueDate: in25Days,
      status: 'Prepared',
      responsiblePerson: 'Dr. Christian Meyer',
      description: 'Submission via Clinical Trials Information System (CTIS) covering clinical sites in Germany, France, and the Netherlands.',
      createdBy: adminUser._id,
    });

    await RegulatoryFiling.create({
      filingName: 'Orphan Drug Designation (ODD) Request for Allogeneic CAR-NK in Relapsed Myeloma',
      filingId: 'REG-FDA-ODD-9031',
      project: project3._id,
      regulatoryAuthority: 'FDA (United States)',
      filingType: 'Orphan Drug Designation',
      submissionDate: new Date('2025-08-10'),
      dueDate: past5Days, // Past due date / approved
      status: 'Approved',
      responsiblePerson: 'Dr. Eleanor Vance',
      description: 'Granted 7-year marketing exclusivity upon approval, exemption from PDUFA application fees, and tax credits for clinical testing.',
      createdBy: adminUser._id,
    });

    console.log('[Seed] Inserting Compliance Items...');
    // 6. Compliance Items (with status and risk level)
    await ComplianceItem.create({
      complianceItem: 'Biosafety Level 3 (BSL-3) Annual Containment Facility Recertification & HEPA Validation',
      category: 'Biosafety (BSL-2/3)',
      project: project1._id,
      responsiblePerson: 'Robert Sterling, Biosafety Officer',
      dueDate: in10Days,
      status: 'In Progress',
      riskLevel: 'Critical',
      description: 'Comprehensive pressure cascade verification, autoclave validation, and emergency aerosol egress drill per CDC/NIH Biosafety Guidelines.',
      createdBy: adminUser._id,
    });

    await ComplianceItem.create({
      complianceItem: 'GLP Preclinical Animal Study Data Audit & Raw Telemetry Archiving',
      category: 'GLP (Good Laboratory Practice)',
      project: project2._id,
      responsiblePerson: 'Dr. Patricia Hayes',
      dueDate: past5Days, // Overdue!
      status: 'Overdue',
      riskLevel: 'High',
      description: 'Formal QA inspection of in-life toxicology records, histopathology slides, and electronic raw data from Charles River Laboratories.',
      createdBy: adminUser._id,
    });

    await ComplianceItem.create({
      complianceItem: 'Export Control EAR99 & Material Transfer Classification of Recombinant Vectors',
      category: 'Export Control / Material Transfer',
      project: project3._id,
      responsiblePerson: 'Marcus Holloway, Esq.',
      dueDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      status: 'Pending',
      riskLevel: 'Medium',
      description: 'Verification of dual-use biological agents list compliance under US Commerce Control List (CCL) Category 1.',
      createdBy: adminUser._id,
    });

    await ComplianceItem.create({
      complianceItem: 'HIPAA & GDPR De-Identification Audit of Patient Bone Marrow Specimen Database',
      category: 'HIPAA / Patient Data',
      project: project1._id,
      responsiblePerson: 'Dr. Eleanor Vance',
      dueDate: new Date('2026-01-15'),
      status: 'Completed',
      riskLevel: 'Low',
      description: 'Third-party cryptographic audit certifying zero residual 18 Safe Harbor identifiers in secondary genomic datasets.',
      createdBy: adminUser._id,
    });

    console.log('[Seed] Inserting Research Collaborations...');
    // 7. Research Collaborations
    await ResearchCollaboration.create({
      collaborationName: 'Broad Institute CRISPR Engineering Consortium',
      collaborationId: 'RC-2024-008',
      project: project1._id,
      partnerOrganization: 'Broad Institute of MIT and Harvard',
      leadResearcher: 'Dr. Sarah Lin (BioVault) & Dr. Feng Zhang (Broad)',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2027-01-31'),
      collaborationType: 'Co-Development',
      status: 'Active',
      description: 'Joint research agreement exploring atomic-resolution Cryo-EM structures of compact Cas endonuclease complexes to guide rational mutagenesis.',
      createdBy: researcherUser._id,
    });

    await ResearchCollaboration.create({
      collaborationName: 'Stanford Bio-X Preclinical Pharmacokinetics & Biodistribution Core',
      collaborationId: 'RC-2025-014',
      project: project2._id,
      partnerOrganization: 'Stanford Bio-X & School of Medicine',
      leadResearcher: 'Dr. David Kowalski',
      startDate: new Date('2025-04-15'),
      endDate: new Date('2027-04-14'),
      collaborationType: 'Pre-clinical Evaluation',
      status: 'Active',
      description: 'Non-invasive PET/CT immuno-imaging of fluorescently-labeled LNPs in orthotopic breast cancer xenograft models.',
      createdBy: researcherUser._id,
    });

    await ResearchCollaboration.create({
      collaborationName: 'Max Planck Institute for Immunobiology Allogeneic Stem Cell Sourcing',
      collaborationId: 'RC-2026-022',
      project: project3._id,
      partnerOrganization: 'Max Planck Institute (Freiburg, Germany)',
      leadResearcher: 'Dr. Kenji Sato',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2028-02-28'),
      collaborationType: 'Sponsored Research Agreement',
      status: 'Proposed',
      description: 'Multi-institutional collaboration developing standardized iPSC-derived progenitor cell lines for scalable off-the-shelf adoptive cellular therapy.',
      createdBy: researcherUser._id,
    });

    console.log('[Seed] Inserting Document Records...');
    // 8. Documents
    await DocumentRecord.create({
      documentName: 'CasX_US11849204_Granted_Claims_Specification.pdf',
      documentType: 'Patent Application Form',
      relatedEntityType: 'Patent',
      relatedEntityId: patent1._id.toString(),
      relatedEntityName: patent1.patentNumber,
      filePath: 'sample_patent_spec.pdf',
      fileSize: 4210400,
      mimeType: 'application/pdf',
      uploadedBy: ipManagerUser._id,
      uploaderName: ipManagerUser.name,
      uploadDate: new Date('2024-01-10'),
      description: 'USPTO certified full patent specification, independent claims 1-24, and molecular sequence listings.',
    });

    await DocumentRecord.create({
      documentName: 'FDA_IND_BV-CasX-101_Investigator_Brochure_v3.pdf',
      documentType: 'FDA 1571 Form',
      relatedEntityType: 'RegulatoryFiling',
      relatedEntityId: project1._id.toString(),
      relatedEntityName: 'BV-CasX-101 IND',
      filePath: 'sample_ind_brochure.pdf',
      fileSize: 8940200,
      mimeType: 'application/pdf',
      uploadedBy: adminUser._id,
      uploaderName: adminUser.name,
      uploadDate: new Date('2025-11-20'),
      description: 'Clinical investigator brochure including pharmacodynamics, maximum tolerated dose calculations, and clinical protocol.',
    });

    console.log('[Seed] Inserting Activity Logs...');
    // 9. Initial Activity Logs
    await ActivityLog.create([
      {
        user: adminUser._id,
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'PROJECT_APPROVED',
        entityType: 'Project',
        entityId: project1._id.toString(),
        details: 'Approved Project PRJ-CRISPR-01 with $12.5M multi-year R&D allocation',
        timestamp: new Date('2024-01-16'),
      },
      {
        user: ipManagerUser._id,
        userName: ipManagerUser.name,
        userRole: ipManagerUser.role,
        action: 'PATENT_GRANTED',
        entityType: 'Patent',
        entityId: patent1._id.toString(),
        details: 'USPTO issued Patent Grant US-11849204-B2',
        timestamp: new Date('2024-11-04'),
      },
      {
        user: ipManagerUser._id,
        userName: ipManagerUser.name,
        userRole: ipManagerUser.role,
        action: 'AGREEMENT_EXECUTED',
        entityType: 'LicensingAgreement',
        details: 'Signed global exclusive license with Novartis Gene Therapies for CasX Oncology',
        timestamp: new Date('2025-01-02'),
      },
      {
        user: researcherUser._id,
        userName: researcherUser.name,
        userRole: researcherUser.role,
        action: 'SUBMIT_DISCLOSURE',
        entityType: 'TechnologyDisclosure',
        entityId: td1._id.toString(),
        details: 'Submitted disclosure TD-2026-081 on high-density enzymatic nucleoside synthesis',
        timestamp: new Date('2026-01-20'),
      },
      {
        user: adminUser._id,
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'COMPLIANCE_ALERT',
        entityType: 'ComplianceItem',
        details: 'Scheduled annual BSL-3 laboratory validation audit',
        timestamp: new Date('2026-02-15'),
      },
    ]);

    console.log('------------------------------------------------------------');
    console.log('Database seeded successfully with authentic Biotechnology records!');
    console.log('------------------------------------------------------------');
    console.log('Demo Credentials:');
    console.log('  1. ADMIN:       admin@biotech-ip.com       / Password123!');
    console.log('  2. IP MANAGER:  manager@biotech-ip.com     / Password123!');
    console.log('  3. RESEARCHER:  researcher@biotech-ip.com  / Password123!');
    console.log('------------------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}
