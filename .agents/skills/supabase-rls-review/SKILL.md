---
name: supabase-rls-review
description: Use when creating/changing Supabase tables, views, functions, storage buckets, policies, roles or access paths.
---
# Supabase RLS Review
1. Read security rules and architecture docs.
2. List data owners and roles: owner, editor, contributor, viewer and unauthenticated.
3. Define SELECT/INSERT/UPDATE/DELETE access for each role.
4. Enable RLS on exposed tables and default deny.
5. Verify membership through trusted database relationships.
6. Review SECURITY DEFINER functions, search_path, grants and service-role use.
7. Test cross-user/cross-trip access and storage paths.
8. Index policy predicates and membership joins where justified.
9. Include migration and rollback notes.
10. Never run production changes without approval.
Deliver a role/action matrix and executable policy tests.
