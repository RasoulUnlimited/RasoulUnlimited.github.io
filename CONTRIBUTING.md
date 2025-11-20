# Contributing

Thank you for considering a contribution to this project. Your contributions help improve the site for everyone.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/RasoulUnlimited/RasoulUnlimited.github.io.git
   cd RasoulUnlimited.github.io
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build assets**
   ```bash
   npm run build
   ```

4. **Development mode with watch**
   ```bash
   npm run dev
   ```

## Code Quality

Before committing, ensure your code passes all quality checks:

```bash
# Run all linting checks
npm run lint

# Run specific linting checks
npm run lint:html    # HTML validation
npm run lint:js      # JavaScript linting

# Automatically fix linting issues
npm run lint:fix

# Security audit of dependencies
npm run audit

# Run tests with strict mode
npm run test:strict
```

### Code Style Guidelines

- **JavaScript**: Follow ESLint rules (see `eslint.config.js`)
- **HTML**: Follow HTMLHint rules (see `.htmlhintrc.json`)
- **Formatting**: Use 2 spaces for indentation (see `.editorconfig`)
- **Code Format**: Use Prettier for consistent formatting (see `.prettierrc.json`)
- **Quotes**: Use double quotes (`"`) in JavaScript
- **Semicolons**: Always use semicolons at end of statements
- **No console**: Remove `console.log()` statements in production code
- **Comments**: Add JSDoc comments for functions and complex logic
- **Naming**: Use camelCase for variables and functions, PascalCase for classes

## Commit Guidelines

Please keep the commit history clear and useful by following these guidelines:

- **Write descriptive commit messages** that quickly explain the intent of each change.
- **Summarize the change** in a short imperative sentence, for example, "Add contact form" or "Fix build script".
- **Avoid generic subjects** such as "Update" or "Fix" without context.
- **Keep the summary line under 50 characters** when possible.
- **Add details in the body** of the commit message if the change needs more explanation.
- **Reference issues**: Use `Closes #123` to automatically link PR to issues

Example:
```
Add dark mode toggle to theme selector

This commit implements a theme toggle button in the header that allows
users to switch between light and dark mode. The preference is saved to
localStorage and persists across sessions.

Closes #45
```

## Pull Request Process

1. **Branch naming**: Use descriptive branch names (e.g., `feature/dark-mode`, `fix/nav-responsive`)
2. **Keep commits organized**: Group related changes in logical commits
3. **Write meaningful PR descriptions**: Explain what you changed and why
4. **Link related issues**: Reference issues that your PR addresses
5. **Test thoroughly**: Verify your changes work across different browsers and devices
6. **Request review**: Assign reviewers for feedback
7. **Resolve conflicts**: Ensure your branch is up to date before merging

## Testing

Run tests before submitting a PR:

```bash
# Run all tests
npm run test

# Run tests with strict warnings disabled
npm test

# Run tests in strict mode (no warnings allowed)
npm run test:strict
```

This will run both ESLint and HTMLHint checks to ensure code quality.

## Reporting Issues

- **Bug reports**: Include steps to reproduce, expected behavior, and actual behavior
- **Feature requests**: Describe the use case and how it benefits users
- **Security issues**: Please follow the process in [`SECURITY.md`](SECURITY.md)
- **Performance issues**: Include metrics or profiling data when available

## Code of Conduct

By contributing, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

If you have questions about contributing, feel free to open an issue or contact the maintainer.

Thank you for your contributions! 🙏
