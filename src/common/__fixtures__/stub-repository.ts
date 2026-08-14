/**
 * Builds a partial test double for a wide abstract class.
 *
 * The full in-memory fakes elsewhere are preferable — they subclass the abstract type, so
 * the compiler rejects them when the contract changes. That is disproportionate for the
 * repositories a use-case touches once: `DepartmentRepository` declares 37 methods and
 * `EmployeeRepository` 18, where a scope check calls exactly one of each.
 *
 * The trade-off is explicit: `overrides` is typed `Partial<T>`, so every method supplied
 * still has its signature checked against the real interface, but methods left out are
 * not caught at compile time. Instead they throw with the method name, so a test that
 * strays beyond what it set up fails loudly rather than reading `undefined`.
 */
export function stubRepository<T extends object>(
  name: string,
  overrides: Partial<T>,
): T {
  return new Proxy(overrides, {
    get(target, property, receiver) {
      if (property in target) {
        return Reflect.get(target, property, receiver);
      }

      // Jest and promise plumbing probe for these; returning a thrower confuses them.
      if (typeof property === 'symbol' || property === 'then') {
        return undefined;
      }

      return () => {
        throw new Error(
          `${name}.${String(property)}() was called but the test did not stub it`,
        );
      };
    },
  }) as T;
}
