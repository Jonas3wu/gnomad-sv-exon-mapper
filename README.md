# gnomAD SV Exon Mapper

gnomAD's structural-variant (SV) pages draw exons without numbers, so it is slow to tell which exons an SV covers, especially in long genes (DYNC2H1 has 89 exons). This tool numbers every exon of a transcript and shows which exons each gnomAD SV covers, fully or partly, with coding/UTR status and a reading-frame estimate. 

It lets you quickly check whether an SV found in a patient's sequencing data is present in gnomAD SV v2.1 or v4.1, and with what allele count, allele number, frequency and homozygote count.

It is a single HTML file. It needs no installation and no server, and it runs in the browser.
**Live tool:** [Jonas3wu.github.io/gnomad-sv-exon-mapper](https://Jonas3wu.github.io/gnomad-sv-exon-mapper/)

example:
<img width="3014" height="876" alt="Dup" src="https://github.com/user-attachments/assets/0fb573ee-a91c-4554-966b-aab44f131dba" />
<img width="1722" height="612" alt="Dup2" src="https://github.com/user-attachments/assets/1bade40f-33ab-4e5b-a099-caf8b284670d" />
<img width="3008" height="1004" alt="Dup3" src="https://github.com/user-attachments/assets/70c443c2-948b-4b62-a355-b64c327da084" />
> Research and curation aid. Not for clinical decision-making. Not affiliated with gnomAD, the Broad Institute, UCSC or MyGene.info.

## Quick start

1. **Fetch by gene.** This is the default route; the other tabs are Paste UCSC row and Demo.
2. **Gene symbol → Look up.** Enter the symbol, with an exact accession if you want one (e.g. `NM_015909.4`), and choose the build. Transcripts come from UCSC; MANE Select is listed first and selected by default.
3. **Transcript → Use.** This loads the numbered exon map.
4. **Fetch from gnomAD.** This pulls the gene's SVs (v4.1 for GRCh38, v2.1 for GRCh37).
5. **Read SVs.** This runs automatically after step 4. Press it yourself only after pasting data.
6. **Show.** Choose the SV types (DEL, DUP, Other). The match query uses the same types.
7. **Sort.** Set the order of the SV rows.

Then pick your variant's exons (click exon numbers on the map, or type the range) to list the matching SVs.

Enter moves you through the steps, and Ctrl/⌘+Enter submits the paste boxes. Try the **Demo** tab for a worked example with synthetic SVs.

**Offline routes:** paste a UCSC Table Browser row (genePred, knownGene or MANE bigGenePred layout). For SVs, paste or upload a gnomAD SV table with its header row, or a quick list such as `chr11:103,200,000-103,250,000 DEL AC=3`.

## Output

- **Exon map:** numbered exons (5′→3′) with one row per SV. It marks full vs. partial (in-exon breakpoint) overlap, intronic SVs, and SVs that run past the gene ends (▶).
- **Which SVs match my variant?** Choose an exon range. The SV type is the one ticked under **Show**, and the two always stay in sync. SVs are grouped as:
  - same exons, fully covered
  - larger SV (with the reason, e.g. `+E8–E11`, `258 kb past 3′ end`)
  - same span with a breakpoint inside an end exon
  - partial overlap

  Each group shows its total allele count, and a summary sentence can be copied.
- **Matched SVs:** in the same panel, only the matching SVs ("Same exon set" and "Larger SV") are listed, with **Allele count, Total allele number, AF and Hom** framed in yellow. Use **Show all** for every SV.
- **gnomAD quality filter:** this is on by default (PASS only), as on the gnomAD website. Untick it to include SVs that gnomAD flagged.
- **Exon table:** SV counts per exon. Both tables export to CSV.

## How it works

- **Transcript:** exon coordinates come from the UCSC Genome Browser API, and the gene location from MyGene.info. The transcript sets only the exon numbering and coding status. gnomAD SV records are genomic coordinates, so they need no conversion.
- **SVs:** they come from gnomAD's public GraphQL API, the same source the gnomAD website uses. The tool checks which fields the API offers and retries without any field it rejects.
- **Frame:** the estimate is coding nt affected mod 3, assuming a simple deletion or a tandem duplication. These cases get their own labels instead of a frame call: start loss, stop loss, whole-transcript events, and duplications that include the first or last coding exon.

Only the gene symbol, region and dataset are sent to these services. Pasted data stays in the browser.

## Limitations

- **Build:** the transcript build must match the dataset (v4.1 = GRCh38, v2.1 = GRCh37). The page warns when it detects a likely mismatch.
- **Breakpoints:** gnomAD SV breakpoints are approximate. Check calls marked `~` (breakpoint inside an exon) against the record.
- **"Larger SV":** an SV that starts even a few kb outside the gene counts as larger. The distance is shown, so you can judge whether it matters.
- **Not applied:** splicing, NMD and ACMG/ClinGen PVS1 or PM2 rules. Follow your laboratory's policy.
- **Small events:** small exon-level events are under-represented in population SV callsets.
- **Sandboxed previews:** live lookups fail inside previews that block outside sites. Open the page from GitHub Pages or as a local file instead.

## Run locally

Download `index.html` and open it in Chrome, Edge or Firefox. If your network blocks an API, use the paste routes.

## Tests

```bash
npm install
npm test
```

This runs unit tests on the core logic and end-to-end tests that load the page in jsdom, using mocked MyGene, UCSC and gnomAD responses shaped like the real APIs. GitHub Actions runs them on every push.

## License

[MIT](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for version history.
