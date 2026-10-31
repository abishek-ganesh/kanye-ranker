// Temporary: proves Vercel Deployment Checks hold a deploy when CI fails. Removed in the next commit.
test('deployment gate check (intentional failure)', () => {
  expect(true).toBe(false);
});
