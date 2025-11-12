# Development Branch Setup

## Branch Structure
- `dev/question-service` - Active development branch
- `feature/question-service-microservice` - Integration branch
- `master` - Production branch

## Development Workflow
1. Make changes on `dev/question-service`
2. Commit and push changes
3. Create PR from `dev/question-service` → `feature/question-service-microservice`
4. After review, merge to integration branch
5. Create final PR from `feature/question-service-microservice` → `master`

## Current Status
- Development branch: `dev/question-service`
- Last commit: `3e6c877` - Add development workflow documentation
- Status: Ready for development