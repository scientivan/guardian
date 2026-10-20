# Production record · 20 October 2026

## What is shown

The final edit combines actual Guardian demo UI captures with explanatory graphics. It is edited footage, not a claim of a single uninterrupted run. All cases and receipts are synthetic. Recording used an isolated SQLite workspace on localhost port 3001, with local file storage. The deployed product continues to use Supabase.

- Case M shows the seeded Budi scenario, individual pledge authorization and withdrawal, sandbox execution, refund allocation, receipt storage, and confirmed case closure. Fresh copies of the same seed were used to repeat and correct shots. Payment authorization is shown through the real UI and server, without mocked responses.
- Case A is separate. Its pending emergency request was fully pledged before the changed-account chat message. The owner’s later execution was rejected with the actual server warning. The private-record request was also refused in the UI.
- Case F is separate. A blank PDF produced `needs_reupload`, then a valid replacement was parsed and saved. The second-reader fallback is explained graphically from implemented behavior. This edit does not claim a successful fresh live second-model check.
- PDF injection is explained with an illustration and explicitly identified archived A2 evidence. It is not presented as a new live PDF attack recording.
- The permission illustration cites archived A4 server tests. Payer and companion screenshots show actual scoped UI. No fabricated HTTP error is overlaid on the application.

The seeded app’s office/history contains sample FISCO and model events. These seeded labels do not establish fresh anchoring or fresh model execution. The video states that production FISCO anchoring is inactive. The current edit does not claim hospital settlement, live exchange rates, real hospital partnerships, or guaranteed general model accuracy.

## Evidence behind the results

- Automated tests were rerun during production. 125 tests in 19 files passed.
- Archived task and attack results come from `evidence/run-2026-10-18-clean-clone/summary.md`, with raw audit JSONL alongside it. Sixteen scenarios passed with Stripe test payments and local FISCO at that time.
- A2 is the hidden PDF instruction test, rejected at registry check 1. A4 covers companion execution and other approval boundary violations. A5 covers private data extraction. The proof cards describe recorded test outcomes rather than a new benchmark.
- The comparison comes from `evidence/baseline-2026-10-18/metrics.json` and the six trial transcripts. Three runs on one synthetic bill found five causes for Guardian and two to four for the generic baseline. It is historical fixture evidence and does not establish a general accuracy rate.
- The five causes and room delta are deterministic calculations. A repeated CBC becomes a hospital question, not a fraud accusation or medical diagnosis.

## Important editorial details

The default scenario has Rina coordinating from Indonesia, Adi in Jakarta, Sari in Kuala Lumpur, Fajar in Dubai, and a Jakarta community fund. The diagram uses the cities and currencies shown in the product.

R2 requests CNY 50,000. The initial CNY 45,000 pledge coverage is insufficient. The fund adds CNY 5,000, withdraws while pending, and pledges again before owner confirmation. Withdrawal revokes a pending authorization. It does not reverse a completed charge.

The final deposits of CNY 80,000 minus the CNY 71,000 bill produce CNY 9,000 in refund shares. The hospital still has to return the money. The closing screen correctly leaves the five outstanding refund shares readable after closing.

R1 uses the existing synthetic initial-deposit receipt. R2 uses a clearly marked synthetic CNY 50,000 guarantee receipt. No medical bill is passed off as proof of payment. Invoice attachments are shared with all case members.

## Recording scripts

The capture scripts require Playwright and an isolated local app. `PLAYWRIGHT` and `BASE_URL` can be adapted in the scripts for another workstation. Current development defaults use `/tmp/guardian-browser/node_modules/playwright`, installed Chrome, and localhost port 3001.

- `scripts/capture.cjs` creates a fresh seeded test session and records setup, bill review, clarification, pledge and withdrawal.
- `scripts/capture-finish.cjs` continues that session through payment, role views, reconciliation and closure.
- `scripts/capture-refund-close.cjs` repeats the refund and closing shots on a fresh synthetic clone, using actual APIs for off-camera setup and actual UI confirmation for closure.
- `scripts/capture-safety.cjs` records independent attack and recovery cases.
- `scripts/capture-polish.cjs` repeats the clean payment and refund framing. Instant scroll positioning avoids the app’s smooth-scroll animation moving the target out of frame. It runs after curation.
- `scripts/make-demo-receipt.cjs` generates the clearly synthetic R2 receipt. `scripts/curate.cjs` excludes browser sessions and raw recordings.

Raw sessions and videos remain in ignored `public/rec/`. Curated assets in `public/demo/` are sufficient for rendering without re-recording. The final edit uses a payment execution clip and a closing confirmation clip, with actual UI result screenshots held for readability. The remaining UI sections use real screenshots with restrained camera movement. The two motion clips were trimmed against inspected media frames, not assumed wall-clock offsets. Payment runs from 19.0–21.2 seconds of its raw capture and closing from 47.0–49.8 seconds of its separate raw capture. Both show the actual confirmation and resulting state.

## Validation

The timeline verifier checks 17 scenes, 59 unique cues, media existence and speech containment within 8,940 frames. The video TypeScript check, root app tests, root lint, root TypeScript check and isolated production build pass. Preview frames are inspected before rendering. Final file metadata and audio/video decoding are checked after rendering.

The user’s original MP4 is preserved as an ignored backup before replacing the root submission filename. Final rendering and file verification results are recorded at the end of this document when complete.


## Final export verified

The submission file is `../AI-I_Couldve_Done_It_Father-DemoVideo.mp4`. FFprobe confirms exactly **298.000 seconds**, 1,920×1,080, H.264 video at 30 fps with **8,940 frames**, and AAC audio at 48 kHz. File size is 90,517,030 bytes. FFmpeg decoded the complete video/audio without errors. A contact sheet sampled all 17 scenes from the final MP4 and was visually inspected. Chrome loaded the file, sought successfully to five positions including 295 seconds, and played forward without a media error. This is local browser validation, not a claim of testing another physical device.

Final measured audio is −16.14 LUFS with a −1.47 dBTP peak. Voice samples were regenerated with headroom before the final frame-aligned mix. The final 900 frames were rendered separately for the evidence path and larger closing URL, then joined at frame 8,040. No scene length changed.

The original 154.752-second file remains at `out/original-before-5min.mp4`. `VALIDATION.json` records metadata, hashes, playback probes and completed code checks. No hackathon submission upload was performed.
