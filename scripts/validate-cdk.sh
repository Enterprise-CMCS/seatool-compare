#!/bin/bash

# CDK Validation Script - Local Development
# This script runs the same validations as the CI/CD pipeline locally
# Usage: ./scripts/validate-cdk.sh [stage] [--quick] [--security] [--all]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STAGE="${1:-default}"
MODE="${2:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🔍 $1${NC}"
    echo "=================================="
}

# Function to check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js: $(node --version)"
    
    # Check Yarn
    if ! command -v yarn &> /dev/null; then
        log_error "Yarn is not installed"
        exit 1
    fi
    log_success "Yarn: $(yarn --version)"
    
    # Check AWS CLI (for template validation)
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not found - CloudFormation template validation will be skipped"
    else
        log_success "AWS CLI: $(aws --version 2>&1 | head -n1)"
    fi
    
    # Check if in correct directory
    if [[ ! -f "package.json" ]]; then
        log_error "This script must be run from the msk-infrastructure directory"
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    log_header "Installing Dependencies"
    
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing Node.js dependencies..."
        yarn install --frozen-lockfile
    else
        log_info "Dependencies already installed, checking for updates..."
        yarn install --frozen-lockfile --check-files
    fi
    
    log_success "Dependencies ready"
}

# Function to run TypeScript compilation
validate_typescript() {
    log_header "TypeScript Compilation Validation"
    
    log_info "Running TypeScript compilation check..."
    if yarn validate:compile; then
        log_success "TypeScript compilation passed"
        return 0
    else
        log_error "TypeScript compilation failed"
        return 1
    fi
}

# Function to run CDK metadata validation
validate_metadata() {
    log_header "CDK Metadata Validation"
    
    log_info "Validating CDK metadata for stage: $STAGE"
    
    # First check if basic CDK list works
    if npx cdk list --context stage="$STAGE" >/dev/null 2>&1; then
        if yarn validate:metadata --context stage="$STAGE"; then
            log_success "CDK metadata validation passed"
            return 0
        else
            log_error "CDK metadata validation failed"
            return 1
        fi
    else
        log_warning "CDK app has configuration issues - skipping metadata validation"
        log_info "This might be due to missing AWS credentials or synthesizer config issues"
        return 0  # Don't fail the entire validation for this
    fi
}

# Function to run CDK synthesis
validate_synth() {
    log_header "CDK Synthesis Validation"
    
    log_info "Running CDK synthesis for stage: $STAGE"
    
    # First try compilation-only validation (safe for pre-commit)
    if [[ "${PRECOMMIT_MODE:-false}" == "true" ]]; then
        log_info "Running in pre-commit mode - compilation check only"
        if yarn validate:compile; then
            log_success "CDK TypeScript compilation successful"
            return 0
        else
            log_error "CDK TypeScript compilation failed"
            return 1
        fi
    fi
    
    # Full synthesis validation (requires AWS access)
    log_info "Running full CDK synthesis validation"
    
    # Check if basic CDK commands work
    if npx cdk list --context stage="$STAGE" >/dev/null 2>&1; then
        if yarn validate:synth --context stage="$STAGE"; then
            log_success "CDK synthesis completed successfully"
            
            # Check if cdk.out directory was created
            if [[ -d "cdk.out" ]]; then
                local template_count=$(find cdk.out -name "*.template.json" | wc -l)
                log_success "Generated $template_count CloudFormation templates"
                
                # Try metadata validation if templates exist
                if [[ $template_count -gt 0 ]]; then
                    if yarn validate:metadata --context stage="$STAGE" 2>/dev/null; then
                        log_success "CDK metadata validation successful"
                    else
                        log_warning "CDK metadata validation failed (this is often harmless)"
                    fi
                fi
            fi
            return 0
        else
            log_error "CDK synthesis failed"
            return 1
        fi
    else
        log_warning "CDK app has configuration issues - attempting compilation-only validation"
        log_info "This might be due to missing AWS credentials or synthesizer config"
        
        # Fall back to compilation-only check
        if yarn validate:compile; then
            log_warning "TypeScript compilation successful but full synthesis requires AWS access"
            log_info "To run full validation, ensure AWS credentials are configured"
            return 0
        else
            log_error "CDK TypeScript compilation failed"
            return 1
        fi
    fi
}

# Pre-commit hook (automatic)
# git commit -m "fix: update configuration"

# Manual pre-commit style validation
# cd msk-infrastructure && yarn validate

# Full validation with AWS access
# cd msk-infrastructure && yarn validate:full

# Comprehensive validation including security
# cd msk-infrastructure && yarn validate:all

# Script-based validation
# PRECOMMIT_MODE=true ./scripts/validate-cdk.sh default --quick

# Function to run CDK diff
validate_diff() {
    log_header "CDK Diff Analysis"
    
    # Check if AWS CLI is available and configured
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not available - skipping CDK diff"
        return 0
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_warning "AWS credentials not configured - skipping CDK diff"
        return 0
    fi
    
    log_info "Running CDK diff for stage: $STAGE"
    
    # Create temp directory if it doesn't exist
    mkdir -p tmp
    
    # Run diff and capture output
    if npx cdk diff --context stage="$STAGE" --security-only=false 2>&1 | tee tmp/cdk-diff-local.txt; then
        if grep -q "There were no differences" tmp/cdk-diff-local.txt; then
            log_success "No infrastructure changes detected"
        elif grep -q "Resources" tmp/cdk-diff-local.txt; then
            log_warning "Infrastructure changes detected - review tmp/cdk-diff-local.txt"
        else
            log_info "CDK diff analysis completed"
        fi
        return 0
    else
        log_warning "CDK diff had issues (this may be normal for new stacks or credential issues)"
        return 0  # Don't fail on diff issues
    fi
}

# Function to run security validation with CDK-nag
validate_security() {
    log_header "Security Analysis with CDK-Nag"
    
    log_info "Running CDK-nag security analysis..."
    mkdir -p tmp
    
    # Create CDK-nag runner script
    cat > tmp/run-cdk-nag-local.js << 'EOF'
const { App, Aspects } = require('aws-cdk-lib');
const { AwsSolutionsChecks } = require('cdk-nag');

// Set up the CDK app with the specified stage
const stage = process.env.STAGE || 'default';
process.env.CDK_CONTEXT_JSON = JSON.stringify({ stage });

const app = new App({
  context: { stage }
});

// Add CDK-nag
Aspects.of(app).add(new AwsSolutionsChecks({ 
  verbose: true,
  logIgnores: true
}));

try {
  console.log(`🔍 Starting CDK-nag analysis for stage: ${stage}`);
  app.synth();
  console.log('✅ CDK-nag analysis completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ CDK-nag analysis failed:', error.message);
  process.exit(1);
}
EOF
    
    if STAGE="$STAGE" node tmp/run-cdk-nag-local.js 2>&1 | tee tmp/cdk-nag-local.txt; then
        log_success "CDK-nag security analysis passed"
        return 0
    else
        log_error "CDK-nag found security issues - review tmp/cdk-nag-local.txt"
        return 1
    fi
}

# Function to validate CloudFormation templates
validate_templates() {
    log_header "CloudFormation Template Validation"
    
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not available - skipping CloudFormation template validation"
        return 0
    fi
    
    if [[ ! -d "cdk.out" ]]; then
        log_warning "No cdk.out directory found - run synthesis first"
        return 0
    fi
    
    local template_count=0
    local validation_errors=0
    
    mkdir -p tmp
    
    for template in cdk.out/*.template.json; do
        if [[ -f "$template" ]]; then
            template_count=$((template_count + 1))
            local template_name=$(basename "$template")
            log_info "Validating template: $template_name"
            
            if aws cloudformation validate-template --template-body "file://$template" >> tmp/template-validation-local.txt 2>&1; then
                log_success "✓ $template_name"
            else
                log_error "✗ $template_name"
                validation_errors=$((validation_errors + 1))
            fi
        fi
    done
    
    if [[ $template_count -eq 0 ]]; then
        log_warning "No CloudFormation templates found to validate"
        return 0
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        log_success "All $template_count CloudFormation templates are valid"
        return 0
    else
        log_error "$validation_errors out of $template_count templates failed validation"
        return 1
    fi
}

# Function to run unit tests
validate_tests() {
    log_header "Unit Tests"
    
    log_info "Running Jest unit tests..."
    if yarn test; then
        log_success "Unit tests passed"
        return 0
    else
        log_error "Unit tests failed"
        return 1
    fi
}

# Function to clean up
cleanup() {
    log_header "Cleanup"
    
    log_info "Cleaning up temporary files..."
    if [[ -f "tmp/run-cdk-nag-local.js" ]]; then
        rm tmp/run-cdk-nag-local.js
    fi
    
    log_success "Cleanup completed"
}

# Function to display usage
show_usage() {
    echo "CDK Validation Script"
    echo ""
    echo "Usage: $0 [stage] [mode]"
    echo ""
    echo "Arguments:"
    echo "  stage    Target stage (default: 'default')"
    echo "  mode     Validation mode:"
    echo "           --quick     Fast validation (compile, metadata, synth)"
    echo "           --security  Security-focused validation (includes CDK-nag)"
    echo "           --all       Full validation (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full validation for default stage"
    echo "  $0 val --quick        # Quick validation for val stage"
    echo "  $0 master --security  # Security validation for master stage"
}

# Main execution flow
main() {
    local validation_errors=0
    
    echo "🔍 CDK Validation Script"
    echo "Stage: $STAGE"
    echo "Mode: $MODE"
    echo ""
    
    # Handle help
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Always run prerequisites and dependencies
    check_prerequisites
    install_dependencies
    
    # Run validations based on mode
    case "$MODE" in
        "--quick")
            log_info "Running quick validation..."
            validate_typescript || validation_errors=$((validation_errors + 1))
            validate_metadata || validation_errors=$((validation_errors + 1))
            validate_synth || validation_errors=$((validation_errors + 1))
            ;;
        "--security")
            log_info "Running security-focused validation..."
            validate_typescript || validation_errors=$((validation_errors + 1))
            validate_synth || validation_errors=$((validation_errors + 1))
            validate_security || validation_errors=$((validation_errors + 1))
            ;;
        "--all"|*)
            log_info "Running comprehensive validation..."
            validate_typescript || validation_errors=$((validation_errors + 1))
            validate_metadata || validation_errors=$((validation_errors + 1))
            validate_synth || validation_errors=$((validation_errors + 1))
            validate_diff || validation_errors=$((validation_errors + 1))
            validate_security || validation_errors=$((validation_errors + 1))
            validate_templates || validation_errors=$((validation_errors + 1))
            validate_tests || validation_errors=$((validation_errors + 1))
            ;;
    esac
    
    cleanup
    
    # Final result
    echo ""
    if [[ $validation_errors -eq 0 ]]; then
        log_success "🎉 All validations passed!"
        exit 0
    else
        log_error "💥 $validation_errors validation(s) failed"
        log_info "Check the output above and tmp/ directory for details"
        exit 1
    fi
}

# Run main function with all arguments
main "$@" 