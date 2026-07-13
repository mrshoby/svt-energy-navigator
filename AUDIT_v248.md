# AUDIT v248

## Responsive defect
At reduced browser widths the historical 1320 px progress media rule switched the tracker to horizontal while the later 173 desktop grid still reserved incompatible columns. The tracker could appear over the left side of the form.

## Responsive fix
A final, high-specificity responsive layer switches the entire page to one-column normal flow below 1600 px. The progress tracker stays above the card, controls cannot exceed the viewport, and fixed help panels return to document flow. Additional 1180/1040/760/520 px breakpoints stack controls and preserve readable labels.

## Storage defect
Both the full dataset and a second full `analysis.chartRows` copy were written to `sessionStorage`. Annual/sub-hourly files can exceed the browser quota.

## Storage fix
- Full dataset: IndexedDB, best effort.
- Session dataset: only required row properties, dynamic time aggregation for large files.
- Session analysis: chart rows omitted and rebuilt on the result page.
- Automatic stronger fallback compaction when a quota exception is detected.
