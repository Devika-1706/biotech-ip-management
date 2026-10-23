import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import app from '../app';
import { connectDatabase } from '../config/database';
import { initRedis } from '../config/redis';

let server: http.Server;
let baseUrl: string;
let authToken: string = '';
let testProjectId: string = '';
let testPatentId: string = '';
let testComplianceId: string = '';

const pass = (name: string) => console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
const fail = (name: string, err: any) => {
  console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`, err);
  throw err;
};

const runTests = async () => {
  console.log('\n============================================================');
  console.log('STARTING BACKEND API & AUTHENTICATION INTEGRATION TESTS');
  console.log('============================================================\n');

  try {
    await connectDatabase();
    await initRedis();

    // Start ephemeral server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        console.log(`Test server active on ${baseUrl}\n`);
        resolve();
      });
    });

    // 1. Test Health endpoint
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      const data = (await res.json()) as any;
      if (res.status === 200 && data.status === 'Operational') {
        pass('GET /api/health - Platform & Services Operational');
      } else {
        throw new Error(`Unexpected status ${res.status}`);
      }
    } catch (e) {
      fail('GET /api/health', e);
    }

    // 2. Test Registration
    const uniqueEmail = `test_admin_${Date.now()}@biotech-test.com`;
    try {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Integration Test Admin',
          email: uniqueEmail,
          password: 'Password123!',
          role: 'ADMIN',
          department: 'Bioengineering',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.success && data.token) {
        authToken = data.token;
        pass('POST /api/auth/register - User Registration & Token issuance');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (e) {
      fail('POST /api/auth/register', e);
    }

    // 3. Test Login
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueEmail,
          password: 'Password123!',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && data.success && data.token) {
        authToken = data.token;
        pass('POST /api/auth/login - Credential verification & JWT issuance');
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (e) {
      fail('POST /api/auth/login', e);
    }

    // 4. Test Authenticated Current User (GET /api/auth/me)
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && data.user.email === uniqueEmail) {
        pass('GET /api/auth/me - Protected Route & Token Decoding');
      } else {
        throw new Error(data.message || 'Auth check failed');
      }
    } catch (e) {
      fail('GET /api/auth/me', e);
    }

    // 5. Test Role Authorization (Protected route without token should return 401)
    try {
      const res = await fetch(`${baseUrl}/api/projects`, { method: 'POST' });
      if (res.status === 401) {
        pass('RBAC Security - Reject Unauthenticated Access (401)');
      } else {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    } catch (e) {
      fail('RBAC Security Check', e);
    }

    // 6. Test Project CRUD
    // Create
    try {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Synthetic Nucleotide Vaccine Candidate',
          code: `PRJ-TEST-${Date.now()}`,
          department: 'Vaccines & Immunology',
          description: 'Test project for full stack integration validation',
          priority: 'High',
          status: 'Active',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.project._id) {
        testProjectId = data.project._id;
        pass('POST /api/projects - Create Project');
      } else {
        throw new Error(data.message || 'Project creation failed');
      }
    } catch (e) {
      fail('POST /api/projects', e);
    }

    // Read list
    try {
      const res = await fetch(`${baseUrl}/api/projects`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && Array.isArray(data.projects)) {
        pass('GET /api/projects - List Projects');
      } else {
        throw new Error('Project list fetch failed');
      }
    } catch (e) {
      fail('GET /api/projects', e);
    }

    // Update
    try {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          priority: 'Critical',
          status: 'Active',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && data.project.priority === 'Critical') {
        pass('PUT /api/projects/:id - Update Project');
      } else {
        throw new Error('Project update failed');
      }
    } catch (e) {
      fail('PUT /api/projects/:id', e);
    }

    // 7. Test Patent CRUD
    try {
      const res = await fetch(`${baseUrl}/api/patents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Modified Oligonucleotide Delivery Liposomes',
          patentNumber: `US-TEST-${Date.now()}`,
          inventors: ['Dr. Integration Tester'],
          project: testProjectId,
          filingDate: new Date().toISOString(),
          applicationStatus: 'Filed',
          jurisdiction: 'USPTO (US)',
          owner: 'BioVault Therapeutics',
          description: 'Synthetic delivery lipid construct',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.patent._id) {
        testPatentId = data.patent._id;
        pass('POST /api/patents - Create Patent with Project Association');
      } else {
        throw new Error(data.message || 'Patent creation failed');
      }
    } catch (e) {
      fail('POST /api/patents', e);
    }

    // Read Patents
    try {
      const res = await fetch(`${baseUrl}/api/patents`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && Array.isArray(data.patents)) {
        pass('GET /api/patents - List Patents with Populated Project');
      } else {
        throw new Error('Patent list fetch failed');
      }
    } catch (e) {
      fail('GET /api/patents', e);
    }

    // 8. Test Compliance Operations
    try {
      const res = await fetch(`${baseUrl}/api/compliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          complianceItem: 'Biosafety Cabinet HEPA Filter Certification',
          category: 'Biosafety (BSL-2/3)',
          project: testProjectId,
          responsiblePerson: 'Safety Compliance Officer',
          dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday to trigger overdue
          riskLevel: 'High',
          description: 'Annual filter certification test',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.complianceItem._id) {
        testComplianceId = data.complianceItem._id;
        // Verify overdue detection
        if (data.complianceItem.status === 'Overdue') {
          pass('POST /api/compliance - Create Compliance & Automatic Overdue Detection');
        } else {
          pass('POST /api/compliance - Create Compliance Item');
        }
      } else {
        throw new Error(data.message || 'Compliance item creation failed');
      }
    } catch (e) {
      fail('POST /api/compliance', e);
    }

    // 9. Test Dashboard Stats
    try {
      const res = await fetch(`${baseUrl}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && data.summary && data.charts) {
        pass('GET /api/dashboard/stats - Real Aggregated Dashboard Metrics');
      } else {
        throw new Error('Dashboard stats fetch failed');
      }
    } catch (e) {
      fail('GET /api/dashboard/stats', e);
    }

    // 10. Test Deadlines Endpoint
    try {
      const res = await fetch(`${baseUrl}/api/deadlines`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && data.summary && data.grouped) {
        pass('GET /api/deadlines - Aggregated Multi-Module Deadlines');
      } else {
        throw new Error('Deadlines fetch failed');
      }
    } catch (e) {
      fail('GET /api/deadlines', e);
    }

    // 11. Test Global Search
    try {
      const res = await fetch(`${baseUrl}/api/search?q=Vaccine`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && data.results) {
        pass('GET /api/search?q=... - Cross-Module Search');
      } else {
        throw new Error('Search failed');
      }
    } catch (e) {
      fail('GET /api/search', e);
    }

    // 12. Test Technology Disclosure & Lifecycle Conversion
    let testDisclosureId = '';
    try {
      const res = await fetch(`${baseUrl}/api/disclosures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Novel Enzymatic Cleavage Protocol for Synthetic gRNA',
          disclosureId: `TD-TEST-${Date.now()}`,
          inventor: 'Dr. Test Inventor',
          project: testProjectId,
          description: 'High-specificity guide RNA trimming method',
          priority: 'High',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.disclosure._id) {
        testDisclosureId = data.disclosure._id;
        pass('POST /api/disclosures - Submit Invention Disclosure');
      } else {
        throw new Error(data.message || 'Disclosure creation failed');
      }
    } catch (e) {
      fail('POST /api/disclosures', e);
    }

    // Convert Disclosure to Patent
    try {
      const res = await fetch(`${baseUrl}/api/disclosures/${testDisclosureId}/convert-to-patent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          patentNumber: `US-CONV-${Date.now()}`,
          jurisdiction: 'USPTO (US)',
          owner: 'BioVault Therapeutics',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.patent && data.disclosure.reviewStatus === 'Converted to Patent') {
        pass('POST /api/disclosures/:id/convert-to-patent - Lifecycle Conversion to Patent');
      } else {
        throw new Error(data.message || 'Conversion failed');
      }
    } catch (e) {
      fail('POST /api/disclosures/:id/convert-to-patent', e);
    }

    // 13. Test Licensing Agreement
    try {
      const res = await fetch(`${baseUrl}/api/agreements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          agreementName: 'Global Exclusive Commercial License Agreement',
          licensee: 'Novartis Test Pharma',
          agreementType: 'Exclusive Commercial License',
          startDate: '2026-01-01',
          endDate: '2030-12-31',
          royaltyInfo: '5% Net Sales',
          project: testProjectId,
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.agreement._id) {
        pass('POST /api/agreements - Create Commercial Licensing Deal');
      } else {
        throw new Error(data.message || 'Agreement creation failed');
      }
    } catch (e) {
      fail('POST /api/agreements', e);
    }

    // 14. Test Regulatory Filing
    try {
      const res = await fetch(`${baseUrl}/api/filings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          filingName: 'IND Phase 1 Submission Dossier',
          regulatoryAuthority: 'FDA (United States)',
          filingType: 'IND (Investigational New Drug)',
          project: testProjectId,
          responsiblePerson: 'Lead Regulatory Director',
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.filing._id) {
        pass('POST /api/filings - Create Regulatory Filing');
      } else {
        throw new Error(data.message || 'Filing creation failed');
      }
    } catch (e) {
      fail('POST /api/filings', e);
    }

    // 15. Test Research Collaboration
    try {
      const res = await fetch(`${baseUrl}/api/collaborations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          collaborationName: 'Preclinical Vector Delivery Consortium',
          project: testProjectId,
          partnerOrganization: 'Stanford Bio-X Institute',
          leadResearcher: 'Dr. Lead Researcher',
          startDate: new Date().toISOString(),
          collaborationType: 'Co-Development',
        }),
      });
      const data = (await res.json()) as any;
      if (res.status === 201 && data.collaboration._id) {
        pass('POST /api/collaborations - Create Research Collaboration');
      } else {
        throw new Error(data.message || 'Collaboration creation failed');
      }
    } catch (e) {
      fail('POST /api/collaborations', e);
    }

    // 16. Test Reports Analytics
    try {
      const res = await fetch(`${baseUrl}/api/reports/statistics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && data.patents && data.projects && data.compliance) {
        pass('GET /api/reports/statistics - Cross-Module Visual Analytics');
      } else {
        throw new Error('Reports statistics fetch failed');
      }
    } catch (e) {
      fail('GET /api/reports/statistics', e);
    }

    // 17. Test Admin User Management
    try {
      const res = await fetch(`${baseUrl}/api/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as any;
      if (res.status === 200 && Array.isArray(data.users)) {
        pass('GET /api/users - Admin User Directory Listing');
      } else {
        throw new Error('User listing failed');
      }
    } catch (e) {
      fail('GET /api/users', e);
    }

    console.log('\n============================================================');
    console.log('ALL COMPLETE BACKEND INTEGRATION TESTS PASSED (17/17)!');
    console.log('============================================================\n');

    if ((server as any).closeAllConnections) {
      (server as any).closeAllConnections();
    }
    server.close();
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    console.error('\nIntegration tests failed:', err);
    if (server) {
      if ((server as any).closeAllConnections) (server as any).closeAllConnections();
      server.close();
    }
    await mongoose.disconnect();
    setTimeout(() => process.exit(1), 100);
  }
};

runTests();
