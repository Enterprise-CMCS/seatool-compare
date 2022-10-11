# this will deploy the oidc cloudformation template with envornment specific parameters
# if run correctly the output should be the arn of the GitHubActionsServiceRole Arn
# there are two parameters $1 = project name $2 = stage [dev | val | production]
# ex. sh setup.sh seatool-compose dev

aws cloudformation deploy --template-file github-actions-oidc-template.yml --stack-name $1-oidc-3 --parameter-overrides file://$2.json --capabilities CAPABILITY_IAM &&
aws cloudformation describe-stack-resource --stack-name $1-oidc --logical-resource-id GitHubActionsServiceRole --query StackResourceDetail.StackId