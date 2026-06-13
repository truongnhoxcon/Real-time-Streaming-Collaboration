# ─────────────────────────────────────────────────────────────────────────────
# Root outputs – exposed after `terraform apply` and consumed by CI/CD pipelines
# ─────────────────────────────────────────────────────────────────────────────
#
# NOTE: These outputs reference module attributes that will be wired in task 13.1.
# They are declared here as placeholders with `value = null` so the file is valid
# before the modules are instantiated.  Once modules are added to main.tf the
# `value` expressions below should be updated to point at the real module outputs.
# ─────────────────────────────────────────────────────────────────────────────

# ALB
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer."
  value       = null # will be: module.alb.alb_dns_name
}

# ECS
output "ecs_cluster_name" {
  description = "Name of the ECS Fargate cluster."
  value       = null # will be: module.ecs.cluster_name
}

output "core_backend_service_name" {
  description = "ECS service name for the core-backend."
  value       = null # will be: module.ecs.core_backend_service_name
}

output "realtime_backend_service_name" {
  description = "ECS service name for the realtime-backend."
  value       = null # will be: module.ecs.realtime_backend_service_name
}

# RDS
output "rds_endpoint" {
  description = "Connection endpoint for the RDS PostgreSQL instance."
  value       = null # will be: module.rds.db_endpoint
  sensitive   = true
}

# ElastiCache Redis
output "redis_endpoint" {
  description = "Primary endpoint for the ElastiCache Redis replication group."
  value       = null # will be: module.elasticache.redis_endpoint
  sensitive   = true
}

# ECR repositories
output "core_backend_ecr_url" {
  description = "ECR repository URL for the core-backend image."
  value       = null # will be: module.ecs.core_backend_ecr_url
}

output "realtime_backend_ecr_url" {
  description = "ECR repository URL for the realtime-backend image."
  value       = null # will be: module.ecs.realtime_backend_ecr_url
}
