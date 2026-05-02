/**
 * Bitbucket Data Center / Server REST API client.
 * Uses /rest/api/1.0/ — completely different from the Cloud API.
 * Supports BBDC-* HTTP access tokens and Basic Auth (username + password/app-password).
 */

export class BitbucketDCService {
  workspace: string;
  private baseUrl: string;
  private token?: string;
  private username?: string;
  private password?: string;

  constructor(
    host: string,
    auth: { token?: string; username?: string; password?: string },
    workspace: string
  ) {
    this.baseUrl = `https://${host}/rest`;
    this.workspace = workspace;
    this.token = auth.token;
    this.username = auth.username;
    this.password = auth.password;
  }

  static fromToken(
    host: string,
    token: string,
    workspace: string
  ): BitbucketDCService {
    return new BitbucketDCService(host, { token }, workspace);
  }

  static fromAppPassword(
    host: string,
    username: string,
    password: string,
    workspace: string
  ): BitbucketDCService {
    return new BitbucketDCService(host, { username, password }, workspace);
  }

  private authHeader(): string {
    if (this.token) return `Bearer ${this.token}`;
    if (this.username && this.password) {
      return `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
    }
    throw new Error('No credentials configured');
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.authHeader(),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return null as T;
    }
    return res.json() as Promise<T>;
  }

  async validateCredentials(): Promise<{
    username: string;
    displayName: string;
  }> {
    try {
      // Try to get user info if we have a username
      if (this.username) {
        const user = await this.request<{ name: string; displayName: string }>(
          'GET',
          `/api/1.0/users/${encodeURIComponent(this.username)}`
        );
        return {
          username: user.name,
          displayName: user.displayName || user.name,
        };
      }

      // Bearer token — no username supplied. Validate by hitting a lightweight endpoint.
      // Use /api/1.0/projects?limit=1 — requires READ permission
      await this.request('GET', '/api/1.0/projects?limit=1');
      // Token is valid; we don't know the display name
      return { username: 'token-auth', displayName: 'Authenticated via token' };
    } catch (error) {
      throw new Error(
        `Invalid Bitbucket Data Center credentials: ${error.message}`
      );
    }
  }

  async getRepository(projectKey: string, repoSlug: string) {
    try {
      const repo = await this.request<{
        name: string;
        public: boolean;
        slug: string;
        project: { key: string };
      }>(
        'GET',
        `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}`
      );
      // Normalize shape to match Cloud response used in bitbucketSetup.ts
      return { name: repo.name, is_private: !repo.public, slug: repo.slug };
    } catch (error) {
      throw new Error(`Failed to get repository: ${error.message}`);
    }
  }

  async getMainBranch(projectKey: string, repoSlug: string): Promise<string> {
    try {
      const branch = await this.request<{ displayId: string }>(
        'GET',
        `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/branches/default`
      );
      return branch.displayId || 'main';
    } catch {
      return 'main';
    }
  }

  async setDefaultBranch(
    projectKey: string,
    repoSlug: string,
    branchName: string
  ): Promise<void> {
    await this.request(
      'PUT',
      `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/branches/default`,
      { id: `refs/heads/${branchName}` }
    );
  }

  async checkRepositoryPermissions(projectKey: string, repoSlug: string) {
    try {
      // Try to fetch repo — if we get it, we have at least read. Assume write since we authenticated.
      await this.getRepository(projectKey, repoSlug);
      return { admin: true, write: true, read: true };
    } catch {
      return { admin: false, write: false, read: false };
    }
  }

  async listRestrictions(
    projectKey: string,
    repoSlug: string
  ): Promise<
    Array<{ id: number; type: string; matcher: { displayId: string } }>
  > {
    try {
      const res = await this.request<{
        values: Array<{
          id: number;
          type: string;
          matcher: { displayId: string };
        }>;
      }>(
        'GET',
        `/branch-permissions/2.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/restrictions?limit=100`
      );
      return res.values || [];
    } catch {
      return [];
    }
  }

  async deleteRestriction(
    projectKey: string,
    repoSlug: string,
    restrictionId: number
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/branch-permissions/2.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/restrictions/${restrictionId}`
    );
  }

  async removeReadOnlyRestrictions(
    projectKey: string,
    repoSlug: string,
    branchName: string
  ): Promise<void> {
    const all = await this.listRestrictions(projectKey, repoSlug);
    const toDelete = all.filter(
      (r) => r.type === 'read-only' && r.matcher?.displayId === branchName
    );
    for (const r of toDelete) {
      try {
        await this.deleteRestriction(projectKey, repoSlug, r.id);
        console.log(
          `   🧹 Removed old read-only restriction (id=${r.id}) from ${branchName}`
        );
      } catch (err) {
        console.warn(
          `   ⚠️  Could not remove restriction ${r.id}: ${err.message}`
        );
      }
    }
  }

  async configureBranchProtection(
    projectKey: string,
    repoSlug: string,
    branchName: string
  ): Promise<Array<{ kind: string; status: string }>> {
    console.log(`🔒 Configuring branch protection for ${branchName}...`);

    const matcher = {
      id: branchName,
      displayId: branchName,
      type: { id: 'BRANCH', name: 'Branch' },
      active: true,
    };

    // DC branch-permissions types that map to Cloud's push/force/delete
    // pull-request-only: blocks direct pushes but still allows PR merges (unlike read-only which blocks everything)
    const restrictions = [
      {
        type: 'pull-request-only',
        description: 'Prevent direct pushes (allow PR merges)',
      },
      { type: 'no-deletes', description: 'Prevent branch deletion' },
      { type: 'fast-forward-only', description: 'Prevent force pushes' },
    ];

    const results: Array<{ kind: string; status: string }> = [];
    for (const r of restrictions) {
      try {
        await this.request(
          'POST',
          `/branch-permissions/2.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/restrictions`,
          { type: r.type, matcher }
        );
        console.log(`   ✅ Created ${r.type} restriction`);
        results.push({ kind: r.type, status: 'created' });
      } catch (error) {
        if (
          error.message?.includes('409') ||
          error.message?.toLowerCase().includes('already')
        ) {
          console.log(`   ⏭️  ${r.type} restriction already exists`);
          results.push({ kind: r.type, status: 'exists' });
        } else {
          console.warn(`   ⚠️  ${r.type} failed: ${error.message}`);
          results.push({ kind: r.type, status: 'failed' });
        }
      }
    }
    return results;
  }

  async getDefaultReviewers(projectKey: string, repoSlug: string) {
    try {
      const res = await this.request(
        'GET',
        `/default-reviewers/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/conditions`
      );
      // Flatten all reviewers from all conditions
      const conditions = (Array.isArray(res) ? res : []) as Array<{
        reviewers?: Array<{ name: string; displayName: string }>;
      }>;
      const reviewers: unknown[] = [];
      for (const c of conditions) {
        const cond = c as {
          reviewers?: Array<{ name: string; displayName: string }>;
        };
        if (cond.reviewers) reviewers.push(...cond.reviewers);
      }
      return reviewers;
    } catch {
      return [];
    }
  }

  async setupDefaultReviewers(
    projectKey: string,
    repoSlug: string,
    usernames: string[]
  ): Promise<Array<{ username: string; status: string }>> {
    const results: Array<{ username: string; status: string }> = [];

    // DC default reviewers are set via a "condition" tied to source/target branches
    const body = {
      requiredApprovals: 1,
      reviewers: usernames.map((name) => ({ name })),
      sourceMatcher: {
        id: 'ANY_REF_MATCHER_ID',
        displayId: 'Any branch',
        type: { id: 'ANY_REF', name: 'Any branch' },
        active: true,
      },
      targetMatcher: {
        id: 'ANY_REF_MATCHER_ID',
        displayId: 'Any branch',
        type: { id: 'ANY_REF', name: 'Any branch' },
        active: true,
      },
    };

    try {
      await this.request(
        'POST',
        `/default-reviewers/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/conditions`,
        body
      );
      for (const u of usernames) results.push({ username: u, status: 'added' });
    } catch (error) {
      const msg: string = error.message || '';
      if (msg.includes('405')) {
        // Personal repos (~username project key) don't support the default-reviewers plugin endpoint
        console.warn(
          `   ⚠️  Default reviewers not supported for personal repositories (405). Configure manually in Bitbucket UI.`
        );
        for (const u of usernames)
          results.push({ username: u, status: 'unsupported' });
      } else if (msg.includes('401') || msg.includes('403')) {
        console.warn(
          `   ⚠️  Insufficient permissions for default reviewers — requires project admin role.`
        );
        for (const u of usernames)
          results.push({ username: u, status: 'failed' });
      } else {
        console.warn(`   ⚠️  Default reviewers condition failed: ${msg}`);
        for (const u of usernames)
          results.push({ username: u, status: 'failed' });
      }
    }

    return results;
  }

  async updateRepositorySettings(
    projectKey: string,
    repoSlug: string,
    settings: { has_issues?: boolean; has_wiki?: boolean; fork_policy?: string }
  ) {
    try {
      // DC doesn't have issues/wiki toggles via REST — it's project-level.
      // We can update the repo's public/private status and forkable flag.
      const body: Record<string, unknown> = {};
      if (
        settings.fork_policy === 'no_public_forks' ||
        settings.fork_policy === 'no_forks'
      ) {
        body.forkable = false;
      } else if (settings.fork_policy === 'allow_forks') {
        body.forkable = true;
      }

      if (Object.keys(body).length > 0) {
        await this.request(
          'PUT',
          `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}`,
          body
        );
      }
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to update repository settings: ${error.message}`);
    }
  }

  async branchExists(
    projectKey: string,
    repoSlug: string,
    branchName: string
  ): Promise<boolean> {
    try {
      const res = await this.request<{ values: Array<{ displayId: string }> }>(
        'GET',
        `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/branches?filterText=${encodeURIComponent(branchName)}&limit=10`
      );
      return res.values?.some((b) => b.displayId === branchName) ?? false;
    } catch {
      return false;
    }
  }

  async createBranch(
    projectKey: string,
    repoSlug: string,
    branchName: string,
    startPoint: string
  ): Promise<void> {
    await this.request(
      'POST',
      `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/branches`,
      { name: branchName, startPoint }
    );
  }

  async createPullRequest(
    projectKey: string,
    repoSlug: string,
    options: {
      title: string;
      sourceBranch: string;
      destBranch: string;
      description?: string;
    }
  ) {
    const repoRef = { slug: repoSlug, project: { key: projectKey } };
    try {
      const pr = await this.request<{
        id: number;
        links: { self: Array<{ href: string }> };
      }>(
        'POST',
        `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/pull-requests`,
        {
          title: options.title,
          description: options.description || '',
          fromRef: {
            id: `refs/heads/${options.sourceBranch}`,
            repository: repoRef,
          },
          toRef: {
            id: `refs/heads/${options.destBranch}`,
            repository: repoRef,
          },
          reviewers: [],
        }
      );

      return {
        id: pr.id,
        links: { html: { href: pr.links?.self?.[0]?.href || '' } },
      };
    } catch (error) {
      const msg: string = error.message || '';
      // 409 = duplicate PR already open
      if (msg.includes('409')) {
        // Extract existing PR details from the error body
        const idMatch = msg.match(/"id":(\d+)/);
        const existingId = idMatch ? parseInt(idMatch[1]) : null;
        const toRefMatch = msg.match(/"toRef":\{[^}]*"displayId":"([^"]+)"/);
        const existingDestBranch = toRefMatch ? toRefMatch[1] : null;
        const hrefMatch = msg.match(
          /"href":"(https?:\/\/[^"]+\/pull-requests\/\d+)"/
        );
        const existingUrl = hrefMatch ? hrefMatch[1] : null;

        // If the existing PR targets the wrong branch, decline it and open a new one
        if (
          existingId &&
          existingDestBranch &&
          existingDestBranch !== options.destBranch
        ) {
          try {
            // Get current PR version (needed for decline API)
            const existing = await this.request<{ version: number }>(
              'GET',
              `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/pull-requests/${existingId}`
            );
            await this.request(
              'POST',
              `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/pull-requests/${existingId}/decline`,
              { version: existing.version }
            );
            // Now create the correct PR
            const pr = await this.request<{
              id: number;
              links: { self: Array<{ href: string }> };
            }>(
              'POST',
              `/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/pull-requests`,
              {
                title: options.title,
                description: options.description || '',
                fromRef: {
                  id: `refs/heads/${options.sourceBranch}`,
                  repository: repoRef,
                },
                toRef: {
                  id: `refs/heads/${options.destBranch}`,
                  repository: repoRef,
                },
                reviewers: [],
              }
            );
            return {
              id: pr.id,
              links: { html: { href: pr.links?.self?.[0]?.href || '' } },
            };
          } catch (retryErr) {
            // If decline/recreate fails, fall through to return the existing PR
            console.warn(
              `   ⚠️  Could not replace old PR: ${retryErr.message}`
            );
          }
        }

        return {
          id: existingId,
          links: { html: { href: existingUrl || '' } },
          existing: true,
        };
      }
      throw new Error(`Failed to create pull request: ${msg}`);
    }
  }
}
