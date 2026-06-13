terraform {
  required_version = "~> 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Module calls will be added in task 13.1 once all modules are implemented.
# Each module is stubbed in terraform/modules/<name>/ and is ready to be wired.
# ─────────────────────────────────────────────────────────────────────────────
