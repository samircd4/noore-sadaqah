# Zakat & fitra sign-off sheet

`zakat-signoff-bn.pdf` is the Bengali question sheet for the foundation's Shariah advisor: every decision in
`../ZAKAT_POLICY.md` (Z1–Z18, F1–F5), the calculator method, the texts to approve, and the signature table.
Print it or send the PDF. When the signed sheet comes back, type each answer into the "Decision" column of
ZAKAT_POLICY.md and fill in its sign-off table; only then can the zakat calculator and the fitra form be built.

`zakat-signoff-bn.html` is the source. If ZAKAT_POLICY.md changes, change the sheet with it and print it again
(the backend image has WeasyPrint and the Bengali fonts):

```bash
docker compose exec -T web uv run python -c "
import sys
from weasyprint import HTML
sys.stdout.buffer.write(HTML(string=sys.stdin.read(), base_url='/app/backend/static').write_pdf())
" < docs/zakat-signoff/zakat-signoff-bn.html > docs/zakat-signoff/zakat-signoff-bn.pdf
```
