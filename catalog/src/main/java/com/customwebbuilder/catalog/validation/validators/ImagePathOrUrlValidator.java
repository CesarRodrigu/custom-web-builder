package com.customwebbuilder.catalog.validation.validators;

import com.customwebbuilder.catalog.validation.ValidImagePathOrUrl;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Validates {@link ValidImagePathOrUrl}: an absolute HTTP(S) link whose domain is whitelisted, or a site relative
 * route.
 *
 * <p>Relative routes carry no domain and skip the whitelist; only absolute links are checked. The
 * host is extracted with {@link URI} instead of string matching so a whitelisted domain placed in the user info
 * ({@code https://allowed.com@evil.com/x.png}) cannot smuggle a foreign host past the check, and it is compared in
 * lower case because hosts are case insensitive.
 *
 * <p>The whitelist comes from {@code catalog.images.allowed-domains} (overridable through the
 * {@code CATALOG_IMAGE_ALLOWED_DOMAINS} environment variable). There is no built-in fallback: when the property is
 * missing or empty the whitelist stays empty and every absolute link is rejected, so an unset property never widens the
 * accepted domains.
 */
@Component
public class ImagePathOrUrlValidator implements ConstraintValidator<ValidImagePathOrUrl, String> {

    /**
     * No built-in domains: without configuration the whitelist stays empty, so only relative routes are accepted until
     * {@code catalog.images.allowed-domains} declares the domains.
     */
    private static final Set<String> DEFAULT_ALLOWED_DOMAINS = Set.of();

    /**
     * Absolute link: an HTTP(S) scheme followed by any non blank character; case insensitive because URI schemes are.
     */
    private static final Pattern HTTP_LINK = Pattern.compile("^https?://\\S+$", Pattern.CASE_INSENSITIVE);

    /**
     * Relative route: optional leading slash, up to five {@code word/%/-} segments and a file name with a single
     * optional extension; the characters can never carry a scheme (no colon), a dot segment ({@code ./}, {@code ../})
     * nor whitespace.
     */
    private static final Pattern RELATIVE_ROUTE = Pattern.compile("^/?(?:[\\w%-]+/){0,5}[\\w%-]+(?:\\.[\\w%-]+)?$");

    /**
     * Domains accepted in absolute links, as configured; never read directly because an instance built outside Spring
     * (by the validation engine in unit tests) keeps an empty whitelist that the test has to fill in.
     */
    @Value("${catalog.images.allowed-domains:}")
    private List<String> configuredDomains = List.copyOf(DEFAULT_ALLOWED_DOMAINS);

    /**
     * Accepts null and blank values: the image is optional, so a missing reference is not a violation of this
     * constraint (the length bound stays with {@code @Size}).
     */
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }

        if (value.startsWith("//") || value.matches("[/.]+")) {
            return false;
        }

        if (HTTP_LINK.matcher(value).matches()) {
            return isAllowedLink(value);
        }

        return RELATIVE_ROUTE.matcher(value).matches();
    }

    /**
     * Reports whether the link points to one of the whitelisted domains.
     *
     * <p>A host matches when it is a listed domain or a subdomain of one, the same way a CSP host
     * source does, so listing {@code example.com} also accepts its CDN ({@code cdn.example.com}) while
     * {@code example.com.evil.com} still fails.
     *
     * @param value absolute HTTP(S) link already matched by {@link #HTTP_LINK}
     *
     * @return true when the parsed host belongs to the whitelist; false also when the host cannot be parsed, so an
     * unreadable link never slips through
     */
    private boolean isAllowedLink(String value) {
        String host;

        try {
            host = URI.create(value).getHost();
        } catch (IllegalArgumentException _) {
            return false;
        }

        if (host == null) {
            return false;
        }

        String normalizedHost = host.toLowerCase(Locale.ROOT);

        return allowedDomains().stream()
                .anyMatch(domain -> normalizedHost.equals(domain) || normalizedHost.endsWith("." + domain));
    }

    /**
     * Returns the configured whitelist, normalized to lower case.
     *
     * @return the domains accepted in absolute links, empty when none is configured, in which case no absolute link is
     * accepted at all
     */
    private Set<String> allowedDomains() {
        if (configuredDomains == null || configuredDomains.isEmpty()) {
            return DEFAULT_ALLOWED_DOMAINS;
        }

        return configuredDomains.stream()
                .map(domain -> domain.trim().toLowerCase(Locale.ROOT))
                .filter(domain -> !domain.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }
}
