# Changelog

## 1.7.0 — 2026-11-21
- **Seven numbered steps:** orange step numbers 1–7 now mark the workflow in order: Fetch by gene → Gene symbol / Look up → Transcript / Use → Fetch from gnomAD → Read SVs → Show → Sort. Steps 2–4 also appear on their input fields.
- **Clearer column names:** "AC" is now **Allele count** and "AN" is **Total allele number**. The match table's total is now **Total allele count**.

## 1.6.0 — 2026-11-21
- **PASS-only by default:** the PASS-only filter is now on by default and is labelled **gnomAD quality filter: PASS only**, so it isn't mistaken for an exon filter. This matches the gnomAD website, which hides filtered SVs by default. Untick it to include SVs flagged by gnomAD (e.g. UNRESOLVED).
- **One panel:** "Which SVs match my variant?" and "SV details" are merged. The panel shows the exon range, a short count per match group with its Total AC, then the matched SVs. Variant IDs are no longer repeated in the count table.
- **Filter column removed:** when PASS-only is off, an SV that failed gnomAD's quality filter is tagged next to its ID instead. CSV export keeps the Filter column.

## 1.5.0 — 2026-11-21
- **One SV-type setting:** the query Type and the **Show** boxes are now one setting, so matches always use the SV types shown on the map. Changing either one updates the other.
- **SV details lists only matching SVs:** once an exon range is set, the table shows only "Same exon set" and "Larger SV" rows. Each row states its match, and larger SVs say why (e.g. `+E9–E10`, `56 kb past 5′ end`). A note counts the SVs not listed, and **Show all** brings back the full table. Export CSV saves what the table shows.
- **Key results framed:** AC, AN, AF and Hom (and Total AC in the match table) sit inside a yellow frame.
- **Fewer columns:** SV details drops the separate Coding nt and Flags columns. Coding nt is already part of the frame text, flags now appear in grey under it, and CSV export keeps every column.

## 1.4.1 — 2026-11-18
- **Fixed: MANE transcripts set the gene to its Ensembl ID.** UCSC's MANE track stores the Ensembl gene ID in `geneName`, which put an ENSG ID into the gnomAD gene box. The gnomAD fetch then failed, and the summary and CSV filenames were wrong. The tool now uses the official gene symbol, and MANE entries show their RefSeq accession.
- **Fixed: accession matching.** An NM_ accession now selects the matching MANE entry, and an accession entered without a version is no longer reported as a mismatch.
- **Fixed: insertions treated as spans.** Insertions pasted from a gnomAD export were stretched to their inserted length and appeared to cover exons. They are now points.
- **Fixed: translocation and breakend partners.** When a CTX/BND's partner breakpoint (chrom2/pos2) falls in the gene, the SV is now mapped there instead of being listed as "other chromosome". Breakend rows copied from the gnomAD table are no longer skipped.
- **Fixed: class names.** gnomAD's export class names "multi CNV" and "other" are now recognised.
- **GRCh37:** lookups no longer request a MANE track, since UCSC has none for this build.

## 1.4.0 — 2026-11-18
- **Step guide:** numbered steps (1–5) on each action, with a progress strip. Done steps show a green ✓ and the next step pulses.
- **Skipped-step hints:** e.g. SVs are loaded but no transcript is in use yet.
- **Steps reset:** steps 2–5 reset when the gene changes, and the page warns if the SVs were fetched for a different gene than the loaded transcript.
- **Gene box copying:** the gnomAD gene box follows the step-1 gene until you edit it.
- **Defaults:** MANE Select is the default transcript, and Read SVs runs automatically after Fetch.

## 1.3.0
- **Keyboard:** Enter advances through Look up → Use → Fetch, and Ctrl/⌘+Enter submits the paste boxes.
- **Recent genes:** chips for recent genes reselect the exact transcript and build, and both gene boxes suggest genes as you type. The history lasts for the browser session.

## 1.2.0
- **Fetch from gnomAD:** pulls SVs directly from gnomAD's GraphQL API (SV v4.1 / v2.1). The dataset follows the transcript build.
- **API changes:** the tool discovers which fields the API offers and retries when it rejects one.
- **Error messages:** clear messages for gene not found, rate limiting (HTTP 429) and blocked connections. Paste/upload remains the fallback.

## 1.1.0
- **Query display:** labelled bracket, highlighted exons and a band through the SV rows.
- **Fix:** whole-gene SVs that extend past the gene are no longer called "same exon set". Both breakpoints must fall inside the gene.
- **Larger and partial matches:** these now say why (extra exons, distance past the 5′/3′ end), and ▶ marks SVs that run past the gene ends.
- **Glossary and tooltips:** added an abbreviations section and column tooltips.
- **Fixes:** long SV IDs are shortened to fit, and the query header wording now matches the SV type.

## 1.0.0 — 2026-11-17
- **First release:** numbered exon map, SV-to-exon overlap, coding/UTR status, frame estimate, query matching, CSV export, plus transcript lookup with an offline UCSC-row fallback.
- **Fixes during build:**
  - Whole-gene deletions are labelled as such rather than "in-frame".
  - Start and stop loss get their own labels.
  - DUPs "span" rather than "remove" the ATG.
  - Size strings (`4.4 kb`) and `chr-pos` fields parse correctly.
  - Header rows are no longer read as data.
