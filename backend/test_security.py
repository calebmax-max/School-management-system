import unittest
from pathlib import Path
import secrets

from fastapi import HTTPException

import backend.main as main


class SecurityFlowTests(unittest.TestCase):
    def setUp(self):
        self.test_db_path = Path(__file__).resolve().parent / f"test-data-{secrets.token_hex(4)}.db"
        main.DATABASE_PATH = self.test_db_path
        main.AUTH_SECRET = "test-auth-secret"
        main.ADMIN_SEED_PASSWORD = "AdminPass123!"
        main.ACCOUNTANT_SEED_PASSWORD = "AccountPass123!"
        main.MEMBER_SEED_PASSWORD = "MemberPass123!"
        main.init_db()

    def tearDown(self):
        if self.test_db_path.exists():
            try:
                self.test_db_path.unlink()
            except PermissionError:
                pass

    def sign_in(self, email, password):
        response = main.sign_in(
            main.AuthSignInRequest(
                email=email,
                password=password,
            )
        )
        return response.token

    def current_user(self, token):
        return main.get_current_user(f"Bearer {token}")

    def test_student_cannot_access_admin_student_list(self):
        signup_response = main.sign_in(
            main.AuthSignInRequest(
                email="amelia.johnson@school.edu",
                password="MemberPass123!",
            )
        )

        with self.assertRaises(HTTPException) as context:
            main.require_roles("admin", "accountant")(self.current_user(signup_response.token))

        self.assertEqual(context.exception.status_code, 403)

    def test_accountant_payment_creates_audit_log(self):
        token = self.sign_in("accountant@gmail.com", "AccountPass123!")
        user = self.current_user(token)

        student = main.record_student_payment(
            1,
            main.StudentPaymentCreate(amount=125, method="Cash", reference="TEST-100", term="termTwo"),
            user,
        )
        self.assertEqual(student.id, 1)
        self.assertEqual(student.payments[0].term, "termTwo")
        self.assertEqual(student.fees_by_term["termTwo"].paid, 125)

        logs = main.list_audit_logs(category=None, current_user=user)
        self.assertTrue(any(entry.action_type == "payment_recorded" for entry in logs))

    def test_accountant_can_sign_in_with_school_email_alias(self):
        token = self.sign_in("accountant@school.edu", "AccountPass123!")
        user = self.current_user(token)

        self.assertEqual(user.email, "accountant@gmail.com")
        self.assertEqual(user.role, "accountant")

    def test_password_change_replaces_old_password(self):
        token = self.sign_in("admin@school.edu", "AdminPass123!")
        user = self.current_user(token)

        result = main.change_password(
            main.ChangePasswordRequest(
                currentPassword="AdminPass123!",
                newPassword="AdminUpdated123!",
            ),
            user,
        )
        self.assertEqual(result["message"], "Password updated successfully")

        with self.assertRaises(HTTPException) as old_password_error:
            main.sign_in(
                main.AuthSignInRequest(
                    email="admin@school.edu",
                    password="AdminPass123!",
                )
            )
        self.assertEqual(old_password_error.exception.status_code, 401)

        refreshed = main.sign_in(
            main.AuthSignInRequest(
                email="admin@school.edu",
                password="AdminUpdated123!",
            )
        )
        self.assertTrue(refreshed.token)

    def test_seeded_student_can_sign_in_with_member_password(self):
        token = self.sign_in("amelia.johnson@school.edu", "MemberPass123!")
        user = self.current_user(token)

        self.assertEqual(user.email, "amelia.johnson@school.edu")
        self.assertEqual(user.role, "student")


if __name__ == "__main__":
    unittest.main()
