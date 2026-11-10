// =========================================================================================================
// STATIC TEST FIXTURE TYPES
// =========================================================================================================
// A script declaration creates the wildcard module instead of attempting to augment a missing module.
// =========================================================================================================

declare module '*.png?inline' {
	const data: string;
	export default data;
}
