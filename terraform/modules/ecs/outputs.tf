# ECS module outputs – defined in tasks 11.1, 11.2

# ─────────────────────────────────────────────────────────────────────────────
# ECR outputs (task 6.1)
# ─────────────────────────────────────────────────────────────────────────────

output "core_backend_ecr_repository_url" {
  description = "ECR repository URL for core-backend. Used in ECS task definitions and GitHub Actions."
  value       = aws_ecr_repository.core_backend.repository_url
}

output "realtime_backend_ecr_repository_url" {
  description = "ECR repository URL for realtime-backend. Used in ECS task definitions and GitHub Actions."
  value       = aws_ecr_repository.realtime_backend.repository_url
}

output "core_backend_ecr_repository_arn" {
  description = "ECR repository ARN for core-backend. Used in IAM policies."
  value       = aws_ecr_repository.core_backend.arn
}

output "realtime_backend_ecr_repository_arn" {
  description = "ECR repository ARN for realtime-backend. Used in IAM policies."
  value       = aws_ecr_repository.realtime_backend.arn
}
