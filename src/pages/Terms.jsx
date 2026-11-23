import React from "react";
import LegalLayout, { Section, Bullets } from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The terms under which you may access and use the GForceSI OpsCenter platform."
      lastUpdated="August 24, 2026"
    >
      <Section title="1. Acceptance of Terms">
        <p>By creating an account or otherwise accessing or using the GForceSI OpsCenter platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you may not access or use the Service. These Terms are effective under the Electronic Signatures in Global and National Commerce Act (ESIGN) and the Minnesota Uniform Electronic Transactions Act (UETA).</p>
      </Section>

      <Section title="2. Nationwide 50-State Service & Enterprise SLAs">
        <p>G-Force SI Inc. provides a nationwide 3D digital-twin capture and field-operations platform operating across <strong>all 50 U.S. states — the Contiguous US (CONUS), Hawaii (HI), and Alaska (AK)</strong>. Services include Matterport Pro3 &amp; E57 LiDAR branch rollouts, AI route and flight-bundled AK/HI mobilization, white-label advertising agency and enterprise client portals, 24–48 hour SLA deliverable review, offline field-crew PWA workflows, and QuickBooks Online billing integration.</p>
      </Section>

      <Section title="3. Accounts & Access">
        <p>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must be at least 16 years old to use the Service. Accounts are granted by invitation and assigned a role (Admin, Dispatcher, Billing Manager, Field Technician, Field Pilot, or Client). You agree to provide accurate information and to keep it current.</p>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree not to:</p>
        <Bullets>
          <li>Use the Service for any unlawful purpose or in violation of any federal or Minnesota law.</li>
          <li>Access or attempt to access data you are not authorized to view.</li>
          <li>Interfere with or disrupt the Service, its security, or its integrations.</li>
          <li>Upload content that infringes the rights of others or that you do not have permission to share.</li>
          <li>Reverse engineer, decompile, or attempt to extract source code or underlying data.</li>
        </Bullets>
      </Section>

      <Section title="5. Independent Contractor Status">
        <p>Field crew engaged through the Service are independent contractors and not employees of GForceSI, unless expressly stated otherwise in a written agreement. Each contractor is responsible for their own taxes, insurance, and compliance with Minnesota independent-contractor classification requirements. GForceSI maintains onboarding records (W-9, certificates of insurance, workers' compensation, and e-signature consent) to support proper classification. Nothing in these Terms creates an employment relationship.</p>
      </Section>

      <Section title="6. Client & Field Crew Responsibilities">
        <Bullets>
          <li><strong>Clients</strong> provide accurate site information, including access hours and notes, and are responsible for site access and safety conditions beyond GForceSI's control.</li>
          <li><strong>Field crew</strong> perform assigned work professionally, update job status accurately, file daily reports, and comply with all site, safety, and legal requirements.</li>
        </Bullets>
      </Section>

      <Section title="7. Billing & Payment">
        <p>Invoices are generated and tracked through the Service and may be synced to QuickBooks. Payment terms are as stated on each invoice (e.g., Net 15, Net 30). Unpaid invoices may accrue late charges as permitted by Minnesota law. Expenses require admin approval before being synced to QuickBooks.</p>
      </Section>

      <Section title="8. Intellectual Property & Deliverables">
        <p>GForceSI retains all rights to the Service, its software, and its branding. Digital-twin deliverables, scans, models, reports, and other work product created for a client are licensed to that client upon full payment, unless a separate written agreement states otherwise. You grant GForceSI a license to host, process, and display content you upload as needed to provide the Service.</p>
      </Section>

      <Section title="9. Confidentiality">
        <p>Each party agrees to keep confidential any non-public information received through the Service, including pricing, client data, and operational details, and to use it only to perform under these Terms. This obligation survives termination.</p>
      </Section>

      <Section title="10. Disclaimers">
        <p>The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, to the maximum extent permitted by law. We do not warrant that the Service will be uninterrupted, error-free, or that location, routing, or ETA data will be accurate.</p>
      </Section>

      <Section title="11. Limitation of Liability">
        <p>To the maximum extent permitted by applicable law, GForceSI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits or data, arising out of or related to the Service. Our aggregate liability for any claim is limited to the amount you paid us for the Service in the twelve months preceding the claim.</p>
      </Section>

      <Section title="12. Indemnification">
        <p>You agree to indemnify and hold GForceSI harmless from claims, damages, and expenses arising from your use of the Service, your breach of these Terms, or your violation of applicable law, including Minnesota labor and safety laws.</p>
      </Section>

      <Section title="13. Governing Law & Dispute Resolution">
        <p>These Terms are governed by the laws of the State of Minnesota, without regard to conflict-of-laws principles. The parties will attempt in good faith to resolve any dispute through negotiation. If unresolved, disputes will be submitted to the state or federal courts located in Minnesota, to which the parties consent to exclusive jurisdiction and venue.</p>
      </Section>

      <Section title="14. Electronic Signatures">
        <p>You acknowledge that your use of the Service, including e-signature consent recorded during onboarding, constitutes an electronic signature under ESIGN and the Minnesota UETA, and that such signatures are valid and binding.</p>
      </Section>

      <Section title="15. Termination">
        <p>We may suspend or terminate your access for violation of these Terms or applicable law. You may stop using the Service at any time. Upon termination, your right to access the Service ends; data will be retained or deleted in accordance with our Privacy Policy and legal obligations.</p>
      </Section>

      <Section title="16. Changes to These Terms">
        <p>We may update these Terms from time to time. We will post the updated version with a revised "Last updated" date. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
      </Section>

      <Section title="17. Contact Us">
        <p>For questions about these Terms, contact GForceSI at <a href="mailto:legal@gforcesi.com" className="text-cyan-400 hover:underline">legal@gforcesi.com</a>, or by mail at GForceSI, Attn: Legal, Minnesota, USA.</p>
      </Section>
    </LegalLayout>
  );
}