import React from "react";
import LegalLayout, { Section, Bullets } from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How GForceSI collects, uses, and protects personal and operational data."
      lastUpdated="August 24, 2026"
    >
      <Section title="1. Overview">
        <p>GForceSI ("we," "us," "our") operates the GForceSI OpsCenter platform (the "Service"), a field-operations and digital-twin management system used by our employees, contractors, and clients. This Privacy Policy describes how we collect, use, disclose, and safeguard information in connection with the Service. We are committed to complying with all applicable federal laws and the laws of the State of Minnesota.</p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We collect the following categories of information:</p>
        <Bullets>
          <li><strong>Account information:</strong> name, email address, password (hashed), role, and authentication tokens.</li>
          <li><strong>Contractor & crew data:</strong> contact details, role, certifications, skills, assigned equipment, onboarding and compliance records (W-9, insurance, workers' compensation, e-signature consent), and emergency contact.</li>
          <li><strong>Location data:</strong> real-time GPS coordinates of field crew who have opted in to location sharing, along with job site addresses and arrival estimates.</li>
          <li><strong>Operational data:</strong> jobs, projects, routes, daily reports, issues, inspections, equipment check-outs, and uploaded photos.</li>
          <li><strong>Financial data:</strong> billing rates, invoices, expenses, and QuickBooks integration identifiers. We do not store full payment card numbers.</li>
          <li><strong>Usage data:</strong> device, browser, and interaction analytics collected automatically when you use the Service.</li>
        </Bullets>
      </Section>

      <Section title="3. How We Use Information">
        <p>We use the information we collect to:</p>
        <Bullets>
          <li>Provide, operate, and improve the Service, including dispatch, routing, and job tracking.</li>
          <li>Verify contractor compliance and manage onboarding and credentials.</li>
          <li>Generate invoices, sync with QuickBooks, and process payroll-related data.</li>
          <li>Communicate with you about jobs, messages, alerts, and account activity.</li>
          <li>Ensure security, prevent fraud, and comply with legal obligations.</li>
        </Bullets>
      </Section>

      <Section title="4. How We Share Information">
        <p>We share information only as necessary to operate the Service and as permitted by law:</p>
        <Bullets>
          <li><strong>Service providers:</strong> QuickBooks (billing/payroll), Google (Sheets import, authentication), and our hosting and analytics providers, under agreements that protect data.</li>
          <li><strong>Between users:</strong> clients may view their jobs, projects, and invoices; dispatchers may view crew status and assignments; field crew may view their assigned jobs.</li>
          <li><strong>Legal compliance:</strong> when required by law, court order, or to protect rights, safety, or property.</li>
        </Bullets>
        <p>We do not sell your personal information.</p>
      </Section>

      <Section title="5. Data Retention">
        <p>We retain personal and operational data for as long as your account is active or as needed to provide the Service, and thereafter as required by law, contract, or legitimate business needs (including tax and employment records). You may request deletion of your data as described below, subject to legal retention obligations.</p>
      </Section>

      <Section title="6. Data Security">
        <p>We use administrative, technical, and physical safeguards designed to protect personal information, including encrypted transmission, access controls, and role-based permissions. No system is perfectly secure, and we cannot guarantee absolute security. In the event of a breach affecting Minnesota residents, we will provide notice as required by Minnesota Statutes § 325E.61.</p>
      </Section>

      <Section title="7. Your Privacy Rights">
        <p>Subject to applicable law, you may request to access, correct, or delete your personal information, or to opt out of certain processing. To exercise these rights, contact us using the information in Section 13. We will respond within the timeframes required by applicable law.</p>
      </Section>

      <Section title="8. Location Data & Consent">
        <p>Real-time location tracking of field crew is enabled only when a crew member affirmatively turns on location sharing in the field app. We comply with the Electronic Communications Privacy Act (ECPA) and applicable Minnesota law regarding consent to location monitoring. Crew may disable location sharing at any time; doing so may limit dispatch functionality but will not affect employment or contractor status.</p>
      </Section>

      <Section title="9. Minnesota-Specific Provisions">
        <Bullets>
          <li><strong>Minnesota Government Data Practices Act (Minnesota Statutes Chapter 13):</strong> To the extent GForceSI acts as a government entity or performs governmental functions, data we maintain may be subject to the Act. We classify and provide access to government data in accordance with Chapter 13.</li>
          <li><strong>Data breach notification (Minnesota Statutes § 325E.61):</strong> In the event of a breach of security involving personal information of Minnesota residents, we will conduct a reasonable investigation and provide notice to affected residents as required.</li>
          <li><strong>Consumer data protection:</strong> We do not sell personal data and provide Minnesota residents the ability to access and delete their personal information as described above.</li>
          <li><strong>Minnesota labor & independent contractor laws:</strong> Contractor records (W-9, insurance, workers' compensation, e-signature consent) are maintained to support proper classification under Minnesota law.</li>
        </Bullets>
      </Section>

      <Section title="10. Children's Privacy">
        <p>The Service is not directed to children under 16, and we do not knowingly collect personal information from children under 16. In accordance with the Children's Online Privacy Protection Act (COPPA) and Minnesota law, if you believe we have collected information from a child under 16, please contact us and we will delete it.</p>
      </Section>

      <Section title="11. Cookies & Analytics">
        <p>We use cookies and similar technologies for authentication and analytics. You can control cookies through your browser settings; disabling them may affect some features of the Service.</p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will post the updated version with a revised "Last updated" date. Material changes will be communicated through the Service or by email where appropriate.</p>
      </Section>

      <Section title="13. Contact Us">
        <p>For privacy questions or to exercise your rights, contact GForceSI at <a href="mailto:privacy@gforcesi.com" className="text-cyan-400 hover:underline">privacy@gforcesi.com</a>, or by mail at GForceSI, Attn: Privacy, Minnesota, USA.</p>
      </Section>
    </LegalLayout>
  );
}