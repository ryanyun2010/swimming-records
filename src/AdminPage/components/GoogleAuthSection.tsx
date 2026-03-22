import { GoogleLogin } from "@react-oauth/google";
export function GoogleAuthSection({
	loggedIn,
	onLogin,
	userEmail
}: {
	loggedIn: boolean;
	onLogin: (res: any) => void;
	userEmail: string | null;
}) {
	return !loggedIn ? (
		<GoogleLogin onSuccess={onLogin} />
	) : (
		<p>
			Logged in as <b>{userEmail}</b>
		</p>
	);
}
