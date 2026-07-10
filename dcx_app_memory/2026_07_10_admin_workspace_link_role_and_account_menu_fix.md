# Admin workspace link role and account-menu fix

The app no longer reconstructs admin access from an incomplete frontend role comparison. It uses the authenticated session's `allowed_surfaces.admin` value, keeping link visibility aligned with backend authorization.

The `Admin workspace` link moved from the sidebar footer into the account pop-out immediately above `Log out`. It remains hidden when the session does not allow the admin surface.

The production build and targeted lint for the changed app files pass.
