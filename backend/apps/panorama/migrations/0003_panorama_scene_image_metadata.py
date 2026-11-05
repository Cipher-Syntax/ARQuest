from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('panorama', '0002_add_anchor_coordinates_to_panoramascene'),
    ]

    operations = [
        migrations.AddField(
            model_name='panoramascene',
            name='width',
            field=models.PositiveIntegerField(blank=True, help_text='Pixel width of the stored panorama', null=True),
        ),
        migrations.AddField(
            model_name='panoramascene',
            name='height',
            field=models.PositiveIntegerField(blank=True, help_text='Pixel height of the stored panorama', null=True),
        ),
        migrations.AddField(
            model_name='panoramascene',
            name='file_size',
            field=models.PositiveBigIntegerField(blank=True, help_text='Stored panorama size in bytes', null=True),
        ),
    ]
