package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.validation.validators.ImagePathOrUrlValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link ImagePathOrUrlValidator}, covering the accepted HTTP(S) links on the whitelisted domains, the
 * accepted relative routes and every family of rejected reference: other schemes, foreign domains, ambiguous forms, dot
 * segments and directory-only values.
 *
 * <p>Every test whitelists the example domains explicitly through {@link #setUp()} because the
 * validator no longer carries built-in domains and nothing injects {@code catalog.images.allowed-domains} into an
 * instance created with {@code new}.
 */
class ValidImagePathOrUrlValidatorTest extends BaseTest {

    /**
     * Domains the tests whitelist, the same ones the dev profile configures.
     */
    private static final List<String> EXAMPLE_DOMAINS = List.of("example.com", "placehold.co");

    private final ImagePathOrUrlValidator validator = new ImagePathOrUrlValidator();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(validator, "configuredDomains", EXAMPLE_DOMAINS);
    }

    @Test
    void acceptsHttpAndHttpsLinksOnWhitelistedDomains() {
        assertThat(isValid("http://example.com/photo.png")).isTrue();
        assertThat(isValid("https://example.com/photo.png")).isTrue();
        assertThat(isValid("https://cdn.example.com/gallery/photo%20v2.png?width=800#top")).isTrue();
        assertThat(isValid("https://placehold.co/600x600?text=Keychron+K2")).isTrue();
    }

    /**
     * Runs the validator the way Bean Validation does, without a context because the validator never customize the
     * violation message.
     *
     * @param value image reference to check, possibly null
     *
     * @return true when the value satisfies the constraint
     */
    private boolean isValid(String value) {
        return validator.isValid(value, null);
    }

    @Test
    void acceptsLinksWithAnySchemeCaseBecauseUriSchemesAreCaseInsensitive() {
        assertThat(isValid("HTTPS://EXAMPLE.COM/photo.png")).isTrue();
    }

    @Test
    void acceptsRootRelativeRoutes() {
        assertThat(isValid("/img/photo.png")).isTrue();
        assertThat(isValid("/photo.png")).isTrue();
    }

    @Test
    void acceptsRelativeRoutesWithAndWithoutLeadingSlash() {
        assertThat(isValid("img/photo.png")).isTrue();
        assertThat(isValid("photo.png")).isTrue();
    }

    @Test
    void acceptsRouteCharactersThatNeverCarryAScheme() {
        assertThat(isValid("IMG/Photo_2-v1.png")).isTrue();
        assertThat(isValid("img/photo%20copy.png")).isTrue();
    }

    @Test
    void acceptsAtMostFiveDirectorySegments() {
        assertThat(isValid("a/b/c/d/e/f.png")).isTrue();
        assertThat(isValid("a/b/c/d/e/f/g.png")).isFalse();
    }

    @Test
    void acceptsMissingValuesBecauseTheImageIsOptional() {
        assertThat(isValid(null)).isTrue();
        assertThat(isValid("")).isTrue();
        assertThat(isValid("   ")).isTrue();
    }

    @Test
    void rejectsSchemesOtherThanHttp() {
        assertThat(isValid("javascript:alert(1)")).isFalse();
        assertThat(isValid("data:image/png;base64,iVBORw0KGgo=")).isFalse();
        assertThat(isValid("ftp://example.com/photo.png")).isFalse();
        assertThat(isValid("file:///etc/passwd")).isFalse();
    }

    @Test
    void rejectsLinksOnDomainsOutsideTheWhitelist() {
        assertThat(isValid("https://evil.com/photo.png")).isFalse();
        assertThat(isValid("http://notexample.com/photo.png")).isFalse();
        assertThat(isValid("https://example.com.evil.com/photo.png")).isFalse();
    }

    @Test
    void rejectsWhitelistedDomainSmuggledThroughUserInfo() {
        assertThat(isValid("https://example.com@evil.com/photo.png")).isFalse();
    }

    @Test
    void acceptsOnlyTheConfiguredDomains() {
        ReflectionTestUtils.setField(validator, "configuredDomains", List.of("cdn.example.com"));

        assertThat(isValid("https://cdn.example.com/photo.png")).isTrue();
        assertThat(isValid("https://img.cdn.example.com/photo.png")).isTrue();
        assertThat(isValid("https://example.com/photo.png")).isFalse();
    }

    @Test
    void rejectsEveryAbsoluteLinkWhenNoDomainIsConfigured() {
        ReflectionTestUtils.setField(validator, "configuredDomains", List.of());

        assertThat(isValid("https://example.com/photo.png")).isFalse();
        assertThat(isValid("/img/photo.png")).isTrue();
    }

    @Test
    void rejectsEveryAbsoluteLinkWhenTheWhitelistIsMissing() {
        ReflectionTestUtils.setField(validator, "configuredDomains", null);

        assertThat(isValid("https://example.com/photo.png")).isFalse();
        assertThat(isValid("/img/photo.png")).isTrue();
    }

    @Test
    void rejectsProtocolRelativeLinksBecauseTheirSchemeIsAmbiguous() {
        assertThat(isValid("//cdn.example.com/photo.png")).isFalse();
    }

    @Test
    void rejectsMalformedLinks() {
        assertThat(isValid("https://")).isFalse();
        assertThat(isValid("http:/example.com/photo.png")).isFalse();
        assertThat(isValid("https://example.com/my photo.png")).isFalse();
    }

    @Test
    void rejectsAnAbsoluteLinkWhoseHostCannotBeParsed() {
        assertThat(isValid("https://[not-an-ipv6/photo.png")).isFalse();
    }

    @Test
    void rejectsAnAbsoluteLinkWithoutHostEvenWhenItsDomainIsWhitelisted() {
        assertThat(isValid("https:///example.com/photo.png")).isFalse();
    }

    @Test
    void ignoresBlankEntriesOfTheConfiguredWhitelist() {
        ReflectionTestUtils.setField(validator, "configuredDomains", List.of("example.com", " ", ""));

        assertThat(isValid("https://example.com/photo.png")).isTrue();
        assertThat(isValid("https://evil.com/photo.png")).isFalse();
    }

    @Test
    void rejectsWindowsPathsBecauseTheColonWouldReadAsAScheme() {
        assertThat(isValid("C:\\images\\photo.png")).isFalse();
    }

    @Test
    void rejectsDirectoryOnlyReferencesBecauseTheyAreNotImages() {
        assertThat(isValid("/")).isFalse();
        assertThat(isValid(".")).isFalse();
        assertThat(isValid("..")).isFalse();
    }

    @Test
    void rejectsDotSegmentRoutesBecauseTheyEscapeTheDeclaredRoute() {
        assertThat(isValid("./photo.png")).isFalse();
        assertThat(isValid("./../photo.png")).isFalse();
        assertThat(isValid("/../photo.png")).isFalse();
        assertThat(isValid("../shared/logo.png")).isFalse();
        assertThat(isValid("/shared/../logo.png")).isFalse();
        assertThat(isValid("shared/../logo.png")).isFalse();

    }
}
