# QR Concierge

`qr-concierge` is a separate project type. Its flow does not change the existing `dealphuquoc` or `pastie-landingpage` projects.

Each QR account belongs to one active Agent. Create an account with a superadmin or project-admin token:

```http
POST /api/admin/qr-accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "qr-concierge",
  "ownerAdminId": 42,
  "label": "Bàn tư vấn 01"
}
```

The response contains `chat_url`, for example `https://dashboard.example/qr/qr_<opaque-code>`. Convert this URL to a QR image and give it to the customer.

Customer authentication supports either Google Sign-In or the OTP email form inside the chat widget. Every new successful login/OTP verification through the same QR automatically closes the preceding active QR chat. QR customer chats expire after 15 minutes. An Agent sees only chats assigned through their own QR accounts; project administrators can see all QR chats in the project.
