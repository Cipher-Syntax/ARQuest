# Generated manually for Unit 03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('buildings', '0001_initial'),
    ]

    operations = [
        # Rename geofence fields
        migrations.RenameField(
            model_name='geofence',
            old_name='center_latitude',
            new_name='latitude',
        ),
        migrations.RenameField(
            model_name='geofence',
            old_name='center_longitude',
            new_name='longitude',
        ),
        # Change radius_meters to DecimalField
        migrations.AlterField(
            model_name='geofence',
            name='radius_meters',
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='building',
            index=models.Index(fields=['slug'], name='buildings_b_slug_idx'),
        ),
        migrations.AddIndex(
            model_name='building',
            index=models.Index(fields=['is_active'], name='buildings_b_is_acti_idx'),
        ),
        migrations.AddIndex(
            model_name='geofence',
            index=models.Index(fields=['building', 'is_active'], name='buildings_g_buildin_idx'),
        ),
        # Add ordering
        migrations.AlterModelOptions(
            name='building',
            options={'ordering': ['-created_at']},
        ),
        migrations.AlterModelOptions(
            name='geofence',
            options={'ordering': ['-created_at']},
        ),
    ]
