export function generateNdaContent(params: {
  companyName: string;
  customerName: string;
  projectName: string;
  date: string;
}): string {
  const { companyName, customerName, projectName, date } = params;

  return `NON-DISCLOSURE AGREEMENT

Effective Date: ${date}

This Non-Disclosure Agreement ("Agreement") is entered into by and between:

1. ${companyName} ("Disclosing Party")
2. ${customerName} ("Receiving Party")

collectively referred to as the "Parties."


1. PURPOSE

The Parties wish to explore a business relationship in connection with the project known as "${projectName}" (the "Purpose"). In connection with the Purpose, the Disclosing Party may share certain confidential and proprietary information with the Receiving Party. This Agreement is intended to protect such information from unauthorized use or disclosure.


2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any and all non-public information, in any form or medium, whether written, oral, electronic, or visual, that is disclosed by the Disclosing Party to the Receiving Party in connection with the Purpose, including but not limited to:

  a) Business plans, strategies, and forecasts
  b) Technical data, designs, and specifications
  c) Software, source code, and algorithms
  d) Customer lists, pricing, and financial information
  e) Marketing plans and product roadmaps
  f) Trade secrets and intellectual property
  g) Any other information designated as confidential at the time of disclosure


3. OBLIGATIONS OF THE RECEIVING PARTY

The Receiving Party agrees to:

  a) Hold all Confidential Information in strict confidence
  b) Not disclose Confidential Information to any third party without the prior written consent of the Disclosing Party
  c) Use Confidential Information solely for the Purpose described in this Agreement
  d) Protect Confidential Information using the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care
  e) Limit access to Confidential Information to those employees, agents, or contractors who have a need to know and who are bound by obligations of confidentiality at least as restrictive as those contained herein


4. EXCLUSIONS FROM CONFIDENTIAL INFORMATION

The obligations of this Agreement shall not apply to information that:

  a) Is or becomes publicly available through no fault of the Receiving Party
  b) Was already known to the Receiving Party prior to disclosure, as evidenced by written records
  c) Is independently developed by the Receiving Party without use of or reference to the Confidential Information
  d) Is rightfully received from a third party without restriction on disclosure
  e) Is required to be disclosed by law, regulation, or court order, provided that the Receiving Party gives prompt written notice to the Disclosing Party prior to such disclosure


5. TERM

This Agreement shall remain in effect for a period of two (2) years from the Effective Date. The obligations of confidentiality shall survive the termination or expiration of this Agreement for a period of two (2) years.


6. RETURN OF INFORMATION

Upon the termination of this Agreement or upon request by the Disclosing Party, the Receiving Party shall promptly return or destroy all copies of Confidential Information in its possession and certify in writing that it has done so.


7. NO LICENSE OR WARRANTY

Nothing in this Agreement grants the Receiving Party any right, title, or interest in the Confidential Information. The Disclosing Party makes no warranty regarding the accuracy or completeness of the Confidential Information.


8. REMEDIES

The Receiving Party acknowledges that any breach of this Agreement may cause irreparable harm to the Disclosing Party, and that monetary damages may be inadequate. Accordingly, the Disclosing Party shall be entitled to seek equitable relief, including injunction and specific performance, in addition to any other remedies available at law or in equity.


9. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which the Disclosing Party is incorporated, without regard to its conflict of laws principles.


10. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior or contemporaneous oral or written agreements concerning such subject matter.


IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.


DISCLOSING PARTY:
${companyName}


RECEIVING PARTY:
${customerName}
`;
}
