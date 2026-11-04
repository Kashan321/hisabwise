import { APP_NAME, BRANDING } from '../../../config/branding';

export function emailLayout(content: string, preheader?: string): string {
  const brand = APP_NAME;
  const accent = BRANDING.emailPrimaryColor;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand}</title>
  ${preheader ? `<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f1f1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8e6;">
          <tr>
            <td style="background:${accent};padding:24px 28px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px">${brand}</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9)">${BRANDING.tagline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e8eeec;font-size:12px;color:#5c6f68;line-height:1.5;">
              You received this email because of your ${brand} account.<br />
              © ${new Date().getFullYear()} ${BRANDING.company}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  const primary = BRANDING.emailPrimaryColor;
  return `<p style="margin:24px 0 8px;text-align:center">
    <a href="${href}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px">${label}</a>
  </p>`;
}
