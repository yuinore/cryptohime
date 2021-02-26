require 'rmagick'
include Magick

TILE_OPACITY = 0.4

sz = 16
images = []

######## Resizing
["01", "02", "03", "04"].each do |file_id|
  image = Image.read("#{file_id}.png").first

  image = image.resize_to_fit(640, 720)
  image = image.crop(CenterGravity, image.columns / sz * sz, image.rows / sz * sz)

  images << image
  image.write("#{file_id}_small.png")
end

######## Basic Variables
transparent_color = Pixel.new(0, 0, 0, QuantumRange)
w = images[0].columns
h = images[0].rows
tile = Image.read("img/tile.png").first
tile = tile.blend(tile, TILE_OPACITY, 0) # change tile opacity
transparent_tile = tile.blend(tile, 0, 0)

######## Generate Block Table
blks = []

[0, 2].each do |image_i|
  blk = Array.new(h * w, false)

  diff = images[image_i].composite(images[image_i + 1], 0, 0, DifferenceCompositeOp)
  (0...w / sz).each do |x|
    (0...h / sz).each do |y|
      (0...sz).each do |i|
        (0...sz).each do |j|
          color = diff.pixel_color(x * sz + i, y * sz + j)

          if ([color.red, color.green, color.blue] != [0, 0, 0])
            blk[y * w + x] = true
            break
          end
        end
      end
    end
  end

  blks << blk
end

######## Composite Tile Graphics
######## and Mask Second Image
[["01", "02", 0, 1], ["03", "04", 2, 3]].each do |image_id1, image_id2, image_i1, image_i2|
  withblock = images[image_i1]
  masked = images[image_i2]
  (0...w / sz).each do |x|
    (0...h / sz).each do |y|
      if blks[image_i1 / 2][y * w + x]
        withblock = withblock.composite(tile, x * sz, y * sz, AtopCompositeOp)
      else
        masked = masked.composite(transparent_tile, x * sz, y * sz, CopyCompositeOp)
      end
    end
  end
  withblock.write("#{image_id1}_withblock.png")
  masked.write("#{image_id2}_masked.png")
end
