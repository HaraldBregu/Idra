import dns from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

type Lookup = (
	hostname: string,
	options: { all: true; verbatim: true }
) => Promise<{ address: string; family: number }[]>;

const blockedIpv4Addresses = new BlockList();
for (const [network, prefix] of [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15],
	['224.0.0.0', 4],
	['240.0.0.0', 4],
] as const)
	blockedIpv4Addresses.addSubnet(network, prefix, 'ipv4');
const blockedIpv6Addresses = new BlockList();
for (const [network, prefix] of [
	['::', 128],
	['::1', 128],
	['::ffff:0:0', 96],
	['fc00::', 7],
	['fe80::', 10],
	['ff00::', 8],
] as const)
	blockedIpv6Addresses.addSubnet(network, prefix, 'ipv6');

export async function publicWebUrl(rawUrl: string, lookup: Lookup = dns.lookup): Promise<URL> {
	const url = new URL(rawUrl);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Website URL must use HTTP or HTTPS.');
	}
	if (url.username || url.password) throw new Error('Website URL must not contain credentials.');

	const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
		throw new Error('Website URL must use a public host.');
	}
	const family = isIP(hostname);
	const addresses = family
		? [{ address: hostname, family }]
		: await lookup(hostname, { all: true, verbatim: true });
	if (addresses.length === 0) throw new Error('Website host did not resolve.');
	for (const address of addresses) {
		const blocked =
			address.family === 6
				? blockedIpv6Addresses.check(address.address, 'ipv6')
				: blockedIpv4Addresses.check(address.address, 'ipv4');
		if (blocked) {
			throw new Error('Website URL must not resolve to a private or local address.');
		}
	}
	return url;
}
