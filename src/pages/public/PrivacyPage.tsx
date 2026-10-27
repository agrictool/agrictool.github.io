export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
        <strong>Draft Notice.</strong> This privacy notice is a working draft provided for the project owner's
        review. It must be reviewed with FUTA's legal team or a qualified legal adviser before it is
        presented to participants. It does not constitute legal advice.
      </div>

      <h1 className="text-2xl font-bold text-[#12304A] mb-2">Privacy Notice</h1>
      <p className="text-sm text-[#5A6472] mb-8">
        RAISSAT Community Impact Project · Digital Food Systems Platform
      </p>

      <div className="prose prose-sm max-w-none space-y-6 text-[#374151]">
        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">1. Who We Are</h2>
          <p>
            The Research Applied Institute for Sustainability in Science, Agriculture and Technology
            (RAISSAT) is the lead organisation for this Community Impact Project, conducted in
            collaboration with the Federal University of Technology, Akure (FUTA). The Project Lead is
            Oladipo Esther Modupe.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">2. What We Collect and Why</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Registration data</strong> (full name, email, department, academic level, optional phone number): to create your participant account and generate your unique participant ID.</li>
            <li><strong>Pre-training assessment responses</strong>: to establish your baseline digital literacy and skills as part of the research evaluation framework.</li>
            <li><strong>Post-training assessment responses</strong>: to measure knowledge gain, evaluate the training programme, and assess the utility of the Digital Food Systems Toolkit.</li>
            <li><strong>Group challenge scores</strong> (where applicable): to facilitate the training event and recognise participant achievement.</li>
            <li><strong>Certificate records</strong>: to issue and maintain a record of your participation certificate.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">3. Legal Basis (Nigeria Data Protection Act 2023)</h2>
          <p>
            We collect and process your data on the basis of your informed consent, provided through
            the consent checkbox on the registration form. You may withdraw consent at any time by
            contacting us (see Section 7), though this may affect your participation in the programme.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">4. Who Can See Your Data</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>You can see your own registration data, assessment responses, and certificate.</li>
            <li>Project administrators (RAISSAT project team) can see all participant data for research and programme management purposes.</li>
            <li>Aggregate, anonymised findings may be shared publicly or in research reports. No personal data will be included in public reports.</li>
            <li>Your data is stored securely in Google Firebase (data centres operated by Google LLC), subject to Google's security and privacy standards.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">5. How Long We Keep Your Data</h2>
          <p>
            Your data will be retained for a minimum of two years following the programme date to
            support research reporting and follow-up evaluation. After this period, personally
            identifiable data will be deleted or anonymised, unless you request earlier deletion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">6. Your Rights</h2>
          <p>Under the Nigeria Data Protection Act 2023, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data (subject to legitimate research retention needs).</li>
            <li>Withdraw consent at any time.</li>
            <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">7. Contact Us</h2>
          <p>
            To exercise any of the above rights or to ask questions about this notice, please contact
            the Project Lead: Oladipo Esther Modupe, RAISSAT Community Impact Project.
            Contact details will be provided once confirmed by the administrator.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#12304A] mb-2">8. Toolkit Contributors</h2>
          <p>
            If you submit a tool to the Digital Food Systems Toolkit Directory, we collect your
            optional name, organisation, and contact email. This information is used only for
            moderation purposes and is never shown publicly. You may request deletion of your
            contributor information at any time.
          </p>
        </section>
      </div>

      <p className="text-xs text-gray-400 mt-10">Last updated: October 2026 (Draft — pending legal review)</p>
    </main>
  )
}
