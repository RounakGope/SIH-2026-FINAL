package in.fasalrakshak.api.security;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// Bearer token -> Spring Security principal (the uid or staff email) with ROLE_<role>.
@Component
public class JwtFilter extends OncePerRequestFilter {
	private final Jwt jwt;

	public JwtFilter(Jwt jwt) { this.jwt = jwt; }

	@Override
	protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
		String h = req.getHeader("Authorization");
		if (h != null && h.startsWith("Bearer ")) {
			Map<String, Object> c = jwt.verify(h.substring(7));
			if (c != null) {
				var auth = new UsernamePasswordAuthenticationToken(c.get("sub"), null,
					List.of(new SimpleGrantedAuthority("ROLE_" + c.get("role"))));
				SecurityContextHolder.getContext().setAuthentication(auth);
			}
		}
		chain.doFilter(req, res);
	}
}
