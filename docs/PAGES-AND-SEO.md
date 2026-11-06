# Pages and SEO

In Admin, open **Pages**. About Us, Contact, Privacy Policy, Shipping & Returns, FAQ, Terms, Size Guide, Track Order and other built-in store screens are already listed. Open a page to edit its available content and its SEO title, description and comma-separated keywords. Storefront remains the editor for homepage sections, checkout copy, and menu links. Built-in shopping and account screens keep their application functions. Product SEO is edited in Products.

To add a page, enter its title, URL slug, introduction and content sections. Unpublished pages are drafts and are unavailable publicly. Check **Published and visible on the website** to publish. Add its path under **Storefront → Navbar & hamburger** or **Footer** to place a link in the store. Published custom slugs remain stable after creation.

SEO fields appear in the page's metadata; the site's API sitemap includes published pages that are not marked noindex. Private and checkout screens stay noindex. The About Us page keeps its existing `/about` address; `/about-us` redirects there.

Merge both folders from this update into the existing project. Keep the existing environment files and production settings. Deploy the API before the frontend. There is no seed or manual database migration: previously saved page content remains available as the starting copy, and new edits are stored as page records.
