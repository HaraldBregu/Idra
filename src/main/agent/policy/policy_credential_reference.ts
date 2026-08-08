const CREDENTIAL_DIRECTORY =
	/(?:^|[\s'"=:/\\])(?:\.ssh|\.aws|\.azure|\.kube)(?:[\/\\]|$)|(?:^|[\s'"=:/\\])\.config[\/\\]gcloud(?:[\/\\]|$)/i;
const CREDENTIAL_FILE =
	/(?:^|[\s'"=:/\\])(?:\.env(?:\.[^\s'"/\\;&|]*)?|credentials(?:\.json)?|service-account(?:\.json)?|id_(?:rsa|dsa|ecdsa|ed25519)|\.npmrc|\.pypirc|\.netrc|\.git-credentials|config\.json|[^\s'"/\\;&|]+\.(?:pem|key|p12|pfx|jks|keystore))(?:$|[\s'";&|])/i;

export function isCredentialReference(value: string): boolean {
	return CREDENTIAL_DIRECTORY.test(value) || CREDENTIAL_FILE.test(value);
}
