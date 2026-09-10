from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone

User = get_user_model()


class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_returns_200(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(response.data['service'], 'MorningBrief API')


class AuthAndPreferencesTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registration_with_name_email_password(self):
        payload = {
            'name': 'Alex Rivera',
            'email': 'alex@morningbrief.dev',
            'password': 'StrongPassword123!',
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['name'], 'Alex Rivera')
        self.assertEqual(response.data['user']['email'], 'alex@morningbrief.dev')
        self.assertIn('tokens', response.data)
        self.assertIsNone(response.data['user']['profile']['completed_at'])

    def test_login_and_logout_blacklist(self):
        user = User.objects.create_user(
            email='testlogin@morningbrief.dev',
            username='testlogin',
            password='Password123!',
        )
        login_resp = self.client.post('/api/v1/auth/login/', {
            'email': 'testlogin@morningbrief.dev',
            'password': 'Password123!',
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        refresh = login_resp.data['refresh']
        access = login_resp.data['access']

        # Logout with refresh token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        logout_resp = self.client.post('/api/v1/auth/logout/', {
            'refresh': refresh,
        }, format='json')
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

        # Refreshing with the blacklisted token should now fail
        refresh_resp = self.client.post('/api/v1/auth/refresh/', {
            'refresh': refresh,
        }, format='json')
        self.assertEqual(refresh_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_preferences_update_and_validation(self):
        user = User.objects.create_user(
            email='prefuser@morningbrief.dev',
            username='prefuser',
            password='Password123!',
        )
        login_resp = self.client.post('/api/v1/auth/login/', {
            'email': 'prefuser@morningbrief.dev',
            'password': 'Password123!',
        }, format='json')
        access = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        # 1. Valid preferences update
        patch_resp = self.client.patch('/api/v1/auth/me/preferences/', {
            'name': 'Alexander',
            'timezone': 'America/New_York',
            'digest_time': '08:30',
            'delivery_channel': 'telegram',
            'job_hunt_mode': True,
            'completed_at': timezone.now().isoformat(),
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['name'], 'Alexander')
        self.assertEqual(patch_resp.data['profile']['timezone'], 'America/New_York')
        self.assertEqual(patch_resp.data['profile']['digest_time'], '08:30:00')
        self.assertEqual(patch_resp.data['profile']['delivery_channel'], 'telegram')
        self.assertTrue(patch_resp.data['profile']['job_hunt_mode'])
        self.assertIsNotNone(patch_resp.data['profile']['completed_at'])

        # 2. Invalid timezone rejected
        bad_tz_resp = self.client.patch('/api/v1/auth/me/preferences/', {
            'timezone': 'Invalid/Unknown_City',
        }, format='json')
        self.assertEqual(bad_tz_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('timezone', bad_tz_resp.data)

        # 3. Invalid digest_time format rejected
        bad_time_resp = self.client.patch('/api/v1/auth/me/preferences/', {
            'digest_time': '25:99',
        }, format='json')
        self.assertEqual(bad_time_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('digest_time', bad_time_resp.data)

    def test_delete_account(self):
        user = User.objects.create_user(
            email='deleteuser@morningbrief.dev',
            username='deleteuser',
            password='Password123!',
        )
        login_resp = self.client.post('/api/v1/auth/login/', {
            'email': 'deleteuser@morningbrief.dev',
            'password': 'Password123!',
        }, format='json')
        access = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        del_resp = self.client.delete('/api/v1/auth/me/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(email='deleteuser@morningbrief.dev').exists())
