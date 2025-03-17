# Public Access Feature Implementation Plan

1. Database Model Update:
   - In app/models.py (Host model), add two new columns:
     • public_access (Boolean, default=False)
     • public_access_token (String or Text) for storing a unique, secure token.
   - Generate migrations if using migrations tools and update the database schema accordingly.

2. Host Form Update and Admin Restriction:
   - Modify HostForm (in app/forms.py) to include a "public_access" BooleanField.
   - Add logic to only display this field if the current_user is_admin or has_permission('publish_host').
   - Add help text clarifying potential security risks.

3. Token Generation and Management:
   - Create a helper function (e.g., generate_unique_token()) that uses a cryptographic library (os.urandom / secrets) to create a sufficiently long token.
   - On enabling public_access, generate and store a secure random token into public_access_token. Handle collisions by regenerating if the token already exists.
   - If public_access is disabled, clear the public_access_token field or leave it but mark it invalid in the model.

4. Public Host View Endpoint:
   - Create a new blueprint or route (e.g., @public.route('/host/<token>')) that does NOT require login.
   - Look up the Host by public_access_token. If found and public_access is True, render a minimal host detail page (name, MAC, an optional "Wake" button).
   - Log each request and store the request IP for audit.
   - Implement rate limiting similarly to how WoL attempts are currently rate-limited (possibly reusing or extending existing logic).

5. Public Host Card Template:
   - Create a new minimal Jinja2 template (e.g., public/host_public_view.html) that lays out the host info and a wake button (if desired).
   - Ensure that no sensitive or admin-only features are exposed.

6. UI Changes:
   - In the host details view (host/view.html), if public_access is True, display the public URL (i.e., /public/host/<public_access_token>).
   - Provide a "Copy Link" button or link for quick sharing.
   - In the host list (host_list.html), add an icon or badge to indicate public-accessible hosts.

7. Logging and Security:
   - Log public access requests (IP, timestamp, token) to the existing security or access logs.
   - Apply or extend rate limiting to the public wake endpoint. Consider storing attempts in a similar structure as wake_attempts.
   - If desired, implement a token expiration mechanism (add an optional database field public_access_expires_at). Deny access if expired.

8. Testing and Verification:
   - Confirm that users without admin privileges do not even see the public access option.
   - Verify token generation, ensuring uniqueness and adequacy of length.
   - Test the public access route from incognito or different browsers to confirm no login is required, and only properly configured hosts are visible.
   - Validate that the wake function is operational from the public page under normal or rate-limited conditions.

This plan neatly integrates the new "Public Access" feature into the existing codebase with minimal layout changes, thorough logging, and proper security checks
