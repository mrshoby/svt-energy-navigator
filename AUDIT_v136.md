# AUDIT v136

Scope: `incarcare-curba-sarcina.html` invoice-only area.

## Fixed
- Removed broken invoice patch leftovers: v120, v130, v131, v132 and invalid `</style data-svt-invoice-upload=...>` fragment.
- Added one scoped block: `svt-v136-true-v132-invoice-baseline`.
- Uses `#invoiceBox`, the real element in the uploaded file, not `#invoicePanel`.
- Does not alter the distributor help modal.
- Does not alter the full page flow outside Step 2 invoice mode.

## Behavior
- Default/file mode: invoice fields hidden.
- Invoice mode: monthly invoice fields visible.
- Inputs compact under labels.
- Upload invoice stays in the invoice panel on the right.

## Not claimed
- No browser screenshot from the user's GitHub Pages after deployment.
