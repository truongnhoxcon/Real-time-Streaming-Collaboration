# ECS module variables – defined in tasks 6.1, 11.1, 11.2

variable "environment" {
  description = "Deployment environment name (dev, staging, prod)."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Short project identifier used as a prefix/suffix for resource names and tags."
  type        = string
  default     = "realtime-collab"
}
