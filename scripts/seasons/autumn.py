# scripts/seasons/autumn.py — 27 Nov 2026 v1
# Autumn: squash and pumpkin, mushrooms, apples, pears, plums and
# blackberries, beetroot and kale; stews, pies and crumbles.
from build import Book

b = Book('autumn', 'Autumn', 'aut')
R, M = b.R, b.M

# ---- Starters ----
R('roast-squash-soup', 'Roast squash and sage soup', 'starter',
  ['butternut-squash 1', 'onion-medium 1', 'olive-oil 2tbsp', 'garlic-clove 2', 'stock-vegetable 1000ml', 'fresh-sage 6', 'nutmeg 0.25tsp'],
  ['Heat the oven to 200C.',
   'Peel and chop {butternut-squash} and {onion-medium}. Toss with {olive-oil} in a tin.',
   'Add {garlic-clove}. Roast 35 minutes, until soft and caramelised.',
   'Tip into a pan with {stock-vegetable}. Simmer 5 minutes.',
   'Blend until smooth. Add {nutmeg}.',
   'Fry {fresh-sage} leaves in a little oil until crisp. Float on top.'],
  serves=6, tier='budget')

R('garlic-mushrooms-toast', 'Garlic mushrooms on toast', 'starter',
  ['olive-oil 3tbsp', 'mushroom-chestnut 16', 'garlic-clove 2', 'fresh-thyme 4', 'lemon 1', 'fresh-parsley 10g', 'sourdough 4'],
  ['Put a large frying pan on a high heat. Add {olive-oil}.',
   'Slice {mushroom-chestnut}. Fry 6 minutes, until browned and the liquid has gone.',
   'Add sliced {garlic-clove} and {fresh-thyme} leaves. Fry 1 minute.',
   'Squeeze in half of {lemon}. Stir in chopped {fresh-parsley}.',
   'Toast {sourdough}. Pile the mushrooms on top.'],
  serves=4, tier='budget', note='A hot, uncrowded pan browns mushrooms. A crowded one stews them.')

R('beetroot-apple-salad', 'Beetroot, apple and walnut salad', 'starter',
  ['beetroot 4', 'apple-medium 1', 'walnuts 50g', 'rocket 60g', 'olive-oil 2tbsp', 'balsamic-vinegar 1tbsp'],
  ['Cut cooked {beetroot} into wedges.',
   'Slice {apple-medium} thinly.',
   'Toast {walnuts} in a dry pan 3 minutes, until fragrant.',
   'Toss {rocket}, the beetroot and apple on plates.',
   'Whisk {olive-oil} with {balsamic-vinegar}. Spoon over. Scatter the walnuts.'],
  serves=4, tier='budget')

R('pear-stilton-chicory', 'Pear, Stilton and chicory salad', 'starter',
  ['chicory 2', 'pear 2', 'stilton 120g', 'walnuts 40g', 'honey 1tbsp', 'olive-oil 2tbsp', 'white-wine-vinegar 1tbsp'],
  ['Separate the leaves of {chicory}. Lay on plates.',
   'Slice {pear} thinly. Tuck between the leaves.',
   'Crumble over {stilton}. Scatter {walnuts}.',
   'Whisk {honey}, {olive-oil} and {white-wine-vinegar}.',
   'Spoon over the salad.'],
  serves=4, tier='everyday')

R('mackerel-beetroot', 'Smoked mackerel with beetroot and horseradish', 'starter',
  ['smoked-mackerel 200g', 'beetroot 3', 'creme-fraiche 100ml', 'horseradish-sauce 1tbsp', 'watercress 40g', 'lemon 1'],
  ['Flake {smoked-mackerel} into large pieces. Take off the skin.',
   'Slice {beetroot}. Lay on plates with the fish.',
   'Stir {horseradish-sauce} into {creme-fraiche}.',
   'Spoon on beside the fish.',
   'Top with {watercress}. Squeeze over {lemon}.'],
  serves=4, tier='everyday')

R('scallops-cauliflower', 'Scallops with cauliflower purée', 'starter',
  ['cauliflower-head 1', 'milk-whole 300ml', 'butter-unsalted 30g', 'scallops 12', 'olive-oil 1tbsp', 'lemon 1'],
  ['Cut {cauliflower-head} into small florets. Simmer in {milk-whole} 12 minutes, until soft.',
   'Drain, keeping a little milk. Blend with half of {butter-unsalted} until silky.',
   'Pat {scallops} dry with kitchen paper.',
   'Put a frying pan on a high heat. Add {olive-oil}.',
   'Sear the scallops 90 seconds a side, until golden. Add the rest of the butter.',
   'Spoon purée onto plates. Top with scallops. Squeeze over {lemon}.'],
  serves=4, tier='special', note='Leave the scallops alone while they sear, so a crust forms.')

R('pork-apple-sausage-rolls', 'Pork and apple sausage rolls', 'starter',
  ['sausagemeat 400g', 'apple-medium 1', 'fresh-sage 6', 'puff-pastry 320g', 'egg-medium 1', 'fennel-seeds 1tsp'],
  ['Heat the oven to 200C.',
   'Grate {apple-medium}. Chop {fresh-sage}. Mix into {sausagemeat}.',
   'Cut {puff-pastry} in half lengthways.',
   'Lay a sausage of the meat along each strip. Roll the pastry over. Seal with a fork.',
   'Brush with beaten {egg-medium}. Sprinkle with {fennel-seeds}. Cut into 12.',
   'Bake 25 minutes, until puffed and golden.'],
  serves=6, tier='budget')

R('chicken-liver-toasts', 'Chicken livers with sherry on toast', 'starter',
  ['chicken-livers 400g', 'butter-unsalted 30g', 'shallot 1', 'sherry 4tbsp', 'fresh-thyme 4', 'sourdough 4'],
  ['Trim {chicken-livers} of any sinew.',
   'Put a frying pan on a high heat. Melt {butter-unsalted}.',
   'Chop {shallot}. Fry 2 minutes.',
   'Add the livers and {fresh-thyme}. Fry 3 minutes, until browned but pink inside.',
   'Add {sherry}. Bubble 1 minute.',
   'Toast {sourdough}. Pile the livers and juices on top.'],
  serves=4, tier='budget')

# ---- Mains ----
R('pork-cider-apples', 'Pork chops with cider and apples', 'main',
  ['pork-chops 4', 'olive-oil 1tbsp', 'apple-medium 2', 'onion-medium 1', 'cider-dry 250ml', 'creme-fraiche 100ml', 'wholegrain-mustard 1tbsp', 'fresh-sage 6'],
  ['Put a large frying pan on a medium-high heat. Add {olive-oil}.',
   'Brown {pork-chops} 4 minutes each side. Lift onto a plate.',
   'Slice {onion-medium} and {apple-medium}. Fry 6 minutes, until golden.',
   'Add {cider-dry} and {fresh-sage}. Bubble 3 minutes.',
   'Return the chops. Simmer 6 minutes, until cooked through.',
   'Stir in {creme-fraiche} and {wholegrain-mustard}.'],
  serves=4, tier='everyday')

R('beef-red-wine-casserole', 'Beef and red wine casserole', 'main',
  ['beef-braising 900g', 'flour-plain 2tbsp', 'olive-oil 2tbsp', 'onion-medium 2', 'carrot-medium 3', 'mushroom-chestnut 12', 'wine-red 300ml', 'stock-cube 1', 'bay-leaf 2', 'fresh-thyme 4'],
  ['Heat the oven to 160C. Cut {beef-braising} into chunks. Toss in {flour-plain}.',
   'Brown the beef in {olive-oil} in a casserole, in batches. Lift out.',
   'Chop {onion-medium} and {carrot-medium}. Fry 8 minutes.',
   'Add {mushroom-chestnut}, {wine-red}, {stock-cube} crumbled in 300 ml water, {bay-leaf} and {fresh-thyme}.',
   'Return the beef. Cover.',
   'Cook in the oven 2 hours 30 minutes, until the beef falls apart.'],
  serves=6, tier='everyday', note='Browning in batches stops the pan cooling and the meat stewing grey.')

R('chicken-mushroom-pie', 'Chicken, leek and mushroom pie', 'main',
  ['butter-unsalted 40g', 'leek 2', 'mushroom-chestnut 12', 'chicken-thigh-boneless 8', 'flour-plain 3tbsp', 'stock-chicken 400ml', 'creme-fraiche 150ml', 'puff-pastry 320g', 'egg-medium 1'],
  ['Heat the oven to 200C. Melt {butter-unsalted} in a large pan.',
   'Slice {leek} and {mushroom-chestnut}. Fry 8 minutes.',
   'Cut {chicken-thigh-boneless} into chunks. Add and fry 5 minutes.',
   'Stir in {flour-plain}. Add {stock-chicken} slowly, stirring until thick.',
   'Stir in {creme-fraiche}. Tip into a pie dish.',
   'Cover with {puff-pastry}. Brush with beaten {egg-medium}.',
   'Bake 30 minutes, until puffed and golden.'],
  serves=6, tier='everyday')

R('lamb-shanks-plums', 'Lamb shanks with plums and star anise', 'main',
  ['lamb-shank 4', 'olive-oil 1tbsp', 'red-onion 2', 'plums 8', 'star-anise 2', 'wine-red 250ml', 'honey 2tbsp', 'stock-cube 1'],
  ['Heat the oven to 160C.',
   'Brown {lamb-shank} in {olive-oil} in a casserole. Lift out.',
   'Slice {red-onion}. Fry 8 minutes.',
   'Halve and stone {plums}. Add with {star-anise}, {wine-red} and {honey}.',
   'Crumble in {stock-cube} with 300 ml water. Return the lamb.',
   'Cover. Cook 2 hours 30 minutes, until the meat falls off the bone.'],
  serves=4, tier='special')

R('herb-crust-cod-lentils', 'Herb-crusted cod with lentils', 'main',
  ['lentils-tinned 2', 'olive-oil 3tbsp', 'garlic-clove 1', 'spinach 100g', 'cod-fillet 4', 'breadcrumbs-dried 40g', 'fresh-parsley 15g', 'lemon 1', 'mustard-dijon 1tbsp'],
  ['Heat the oven to 200C.',
   'Mix {breadcrumbs-dried}, chopped {fresh-parsley}, the zest of {lemon} and 1 tbsp of {olive-oil}.',
   'Brush {cod-fillet} with {mustard-dijon}. Press the crumbs on top.',
   'Bake 12 minutes, until the fish flakes.',
   'Warm drained {lentils-tinned} in the rest of the oil with sliced {garlic-clove}.',
   'Stir in {spinach} until wilted. Add the lemon juice. Serve under the fish.'],
  serves=4, tier='everyday')

R('haddock-leek-gratin', 'Smoked haddock and leek gratin', 'main',
  ['haddock-smoked 500g', 'milk-whole 500ml', 'butter-unsalted 40g', 'leek 2', 'flour-plain 3tbsp', 'cheddar-cheese 80g', 'potato-medium 4'],
  ['Heat the oven to 200C. Slice {potato-medium} thinly. Boil 5 minutes. Drain.',
   'Simmer {haddock-smoked} in {milk-whole} 5 minutes. Lift out the fish. Keep the milk.',
   'Melt {butter-unsalted} in a pan. Slice {leek}. Fry 6 minutes.',
   'Stir in {flour-plain}. Add the milk slowly, stirring until thick.',
   'Flake in the fish. Tip into a dish. Top with the potatoes.',
   'Scatter {cheddar-cheese}. Bake 25 minutes, until golden.'],
  serves=4, tier='everyday')

R('squash-prawn-curry', 'Squash and king prawn red curry', 'main',
  ['vegetable-oil 1tbsp', 'thai-red-curry-paste 3tbsp', 'butternut-squash 1', 'coconut-milk-tinned 1', 'king-prawns-raw 300g', 'spinach 100g', 'lime 1', 'fish-sauce 1tbsp', 'rice-jasmine-dry 300g'],
  ['Cook {rice-jasmine-dry} for the time on the packet.',
   'Fry {thai-red-curry-paste} in {vegetable-oil} 1 minute.',
   'Peel and dice half of {butternut-squash}. Add with {coconut-milk-tinned}.',
   'Simmer 15 minutes, until the squash is soft.',
   'Add {king-prawns-raw}. Cook 3 minutes, until pink.',
   'Stir in {spinach}, {fish-sauce} and the juice of {lime}.'],
  serves=4, tier='everyday')

R('wild-mushroom-risotto', 'Mushroom and thyme risotto', 'main',
  ['shiitake-dried 20g', 'stock-vegetable 1200ml', 'butter-unsalted 40g', 'onion-medium 1', 'mushroom-chestnut 16', 'rice-arborio-dry 300g', 'wine-white 125ml', 'fresh-thyme 4', 'parmesan 50g'],
  ['Soak {shiitake-dried} in 200 ml boiling water 20 minutes. Chop. Add the water to {stock-vegetable}.',
   'Melt {butter-unsalted} in a wide pan. Chop {onion-medium}. Fry 8 minutes.',
   'Slice {mushroom-chestnut}. Fry with the shiitake 5 minutes.',
   'Add {rice-arborio-dry}. Stir 1 minute. Add {wine-white}.',
   'Add the hot stock a ladle at a time, stirring, about 18 minutes.',
   'Stir in {fresh-thyme} leaves and grated {parmesan}.'],
  serves=4, tier='everyday')

R('squash-sage-pasta', 'Roast squash, sage and goats cheese pasta', 'main',
  ['butternut-squash 1', 'olive-oil 3tbsp', 'garlic-clove 3', 'penne-dry 350g', 'fresh-sage 8', 'goats-cheese 120g', 'walnuts 40g'],
  ['Heat the oven to 200C.',
   'Peel and dice half of {butternut-squash}. Toss with 2 tbsp of {olive-oil} and {garlic-clove}.',
   'Roast 30 minutes, until soft and browned.',
   'Cook {penne-dry} for the time on the packet. Keep a mug of water.',
   'Fry {fresh-sage} in the rest of the oil until crisp.',
   'Toss the pasta, squash, sage and a splash of water. Top with {goats-cheese} and {walnuts}.'],
  serves=4, tier='budget')

R('cauliflower-cheese', 'Cauliflower cheese with crispy crumbs', 'main',
  ['cauliflower-head 1', 'butter-unsalted 40g', 'flour-plain 3tbsp', 'milk-whole 500ml', 'cheddar-cheese 150g', 'mustard-dijon 1tsp', 'breadcrumbs-dried 30g'],
  ['Heat the oven to 200C.',
   'Cut {cauliflower-head} into florets. Boil 5 minutes. Drain well.',
   'Melt {butter-unsalted}. Stir in {flour-plain} 1 minute.',
   'Add {milk-whole} slowly, stirring until thick and smooth.',
   'Stir in two thirds of {cheddar-cheese} and {mustard-dijon}.',
   'Pour over the cauliflower. Top with the rest of the cheese and {breadcrumbs-dried}.',
   'Bake 25 minutes, until bubbling and golden.'],
  serves=4, tier='budget')

R('mushroom-lentil-cottage-pie', 'Mushroom and lentil cottage pie', 'main',
  ['potato-large 4', 'olive-oil 4tbsp', 'onion-medium 1', 'carrot-medium 2', 'mushroom-chestnut 12', 'lentils-tinned 2', 'tomato-purée 2tbsp', 'soy-sauce 2tbsp', 'stock-vegetable 300ml', 'fresh-thyme 4'],
  ['Heat the oven to 200C. Peel {potato-large}. Boil 20 minutes. Mash with 2 tbsp of {olive-oil}.',
   'Fry chopped {onion-medium} and {carrot-medium} in the rest of the oil 8 minutes.',
   'Chop {mushroom-chestnut}. Fry 6 minutes.',
   'Add drained {lentils-tinned}, {tomato-purée}, {soy-sauce}, {stock-vegetable} and {fresh-thyme}.',
   'Simmer 10 minutes, until thick. Tip into a dish.',
   'Top with the mash. Bake 25 minutes, until golden on top.'],
  serves=6, tier='budget')

R('pumpkin-black-bean-chilli', 'Pumpkin and black bean chilli', 'main',
  ['olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2', 'cumin-ground 2tsp', 'smoked-paprika 1tsp', 'chilli-powder 1tsp', 'pumpkin 600g', 'black-beans-tinned 2', 'chopped-tomatoes-tinned 1', 'lime 1', 'fresh-coriander 15g'],
  ['Put a large pan on a medium heat. Add {olive-oil}.',
   'Chop {onion-medium}. Fry 8 minutes. Add {garlic-clove}, {cumin-ground}, {smoked-paprika} and {chilli-powder}.',
   'Dice {pumpkin}. Add and stir 2 minutes.',
   'Add drained {black-beans-tinned} and {chopped-tomatoes-tinned}.',
   'Simmer 25 minutes, until the pumpkin is tender.',
   'Squeeze in {lime}. Scatter with {fresh-coriander}.'],
  serves=6, tier='budget', swaps=[('pumpkin', 'Butternut squash, the same weight')])

R('beetroot-lentil-salad', 'Warm beetroot and lentil salad', 'main',
  ['beetroot-raw 4', 'red-onion 1', 'olive-oil 4tbsp', 'lentils-green-dry 200g', 'walnuts 50g', 'kale 100g', 'balsamic-vinegar 2tbsp', 'mustard-dijon 1tsp'],
  ['Heat the oven to 200C. Peel and cut {beetroot-raw} and {red-onion} into wedges.',
   'Toss with 2 tbsp of {olive-oil}. Roast 40 minutes, until tender.',
   'Simmer {lentils-green-dry} in water 25 minutes, until tender. Drain.',
   'Strip {kale} from its stalks. Add to the tin for the last 5 minutes.',
   'Whisk the rest of the oil, {balsamic-vinegar} and {mustard-dijon}.',
   'Toss everything together. Scatter {walnuts}.'],
  serves=4, tier='budget')

# ---- Sides ----
R('roast-squash-wedges', 'Roast squash wedges with chilli', 'side',
  ['butternut-squash 1', 'olive-oil 2tbsp', 'chilli-flakes 0.5tsp', 'salt 0.5tsp'],
  ['Heat the oven to 200C.',
   'Cut {butternut-squash} into wedges, skin on. Take out the seeds.',
   'Toss with {olive-oil}, {chilli-flakes} and {salt}.',
   'Roast 40 minutes, turning once, until soft and charred at the edges.'],
  serves=6, tier='budget')

R('garlic-kale', 'Garlic kale', 'side',
  ['kale 300g', 'olive-oil 2tbsp', 'garlic-clove 2', 'lemon 1'],
  ['Strip {kale} from its stalks. Tear into pieces.',
   'Put a wide pan on a medium heat. Add {olive-oil}.',
   'Slice {garlic-clove}. Fry 1 minute.',
   'Add the kale and a splash of water. Stir 4 minutes, until tender. Squeeze over {lemon}.'],
  serves=4, tier='budget')

R('celeriac-mash', 'Celeriac and potato mash', 'side',
  ['celeriac 600g', 'potato-medium 3', 'butter-unsalted 40g', 'milk-whole 100ml', 'nutmeg 0.25tsp'],
  ['Peel and dice {celeriac} and {potato-medium}.',
   'Boil 20 minutes, until soft. Drain well.',
   'Mash with {butter-unsalted} and warm {milk-whole}.',
   'Grate in {nutmeg}.'],
  serves=6, tier='budget')

R('roast-roots', 'Thyme roast roots', 'side',
  ['carrot-large 3', 'parsnip 3', 'red-onion 2', 'olive-oil 3tbsp', 'fresh-thyme 6'],
  ['Heat the oven to 200C.',
   'Cut {carrot-large}, {parsnip} and {red-onion} into chunks.',
   'Toss with {olive-oil} and {fresh-thyme}.',
   'Roast 40 minutes, turning once, until golden.'],
  serves=6, tier='budget')

R('apple-fennel-slaw', 'Apple and fennel slaw', 'side',
  ['fennel-bulb 1', 'apple-medium 2', 'red-cabbage 200g', 'lemon 1', 'olive-oil 2tbsp', 'wholegrain-mustard 1tsp'],
  ['Slice {fennel-bulb}, {apple-medium} and {red-cabbage} very thinly.',
   'Whisk the juice of {lemon}, {olive-oil} and {wholegrain-mustard}.',
   'Toss with the vegetables.'],
  serves=6, tier='budget')

# ---- Puddings ----
R('apple-blackberry-crumble', 'Apple and blackberry crumble', 'pudding',
  ['apple-cooking 3', 'blackberries 200g', 'sugar-caster 80g', 'flour-plain 150g', 'dairy-free-spread 100g', 'sugar-demerara 50g', 'cinnamon-ground 1tsp'],
  ['Heat the oven to 190C.',
   'Peel, core and slice {apple-cooking}. Toss with {blackberries}, {sugar-caster} and {cinnamon-ground}.',
   'Tip into a baking dish.',
   'Rub {dairy-free-spread} into {flour-plain} until like breadcrumbs. Stir in {sugar-demerara}.',
   'Scatter over the fruit.',
   'Bake 35 minutes, until golden and bubbling.'],
  serves=6, tier='budget', note='Made with spread, so it is vegan. Butter works too.')

R('baked-apples', 'Baked apples with maple and pecans', 'pudding',
  ['apple-cooking 4', 'pecans 50g', 'sultanas 40g', 'maple-syrup 4tbsp', 'cinnamon-ground 1tsp'],
  ['Heat the oven to 180C.',
   'Core {apple-cooking}. Score a line round the middle of each.',
   'Chop {pecans}. Mix with {sultanas} and {cinnamon-ground}.',
   'Stuff into the apples. Stand them in a dish.',
   'Pour over {maple-syrup}. Bake 40 minutes, until soft and puffing.'],
  serves=4, tier='budget', note='The scored line stops the skins bursting.')

R('port-plums', 'Plums roasted in port with coconut yoghurt', 'pudding',
  ['plums 8', 'port 100ml', 'sugar-soft-brown 2tbsp', 'cinnamon-stick 1', 'coconut-yoghurt 300g'],
  ['Heat the oven to 200C.',
   'Halve and stone {plums}. Lay cut side up in a dish.',
   'Pour over {port}. Sprinkle {sugar-soft-brown}. Add {cinnamon-stick}.',
   'Roast 20 minutes, until soft and syrupy.',
   'Serve warm with {coconut-yoghurt}.'],
  serves=4, tier='everyday')

R('pear-frangipane', 'Pear and almond tart', 'pudding',
  ['shortcrust-pastry 320g', 'butter-unsalted 100g', 'sugar-caster 100g', 'egg-medium 2', 'ground-almonds 100g', 'pear 3'],
  ['Heat the oven to 190C. Line a 23 cm tin with {shortcrust-pastry}.',
   'Bake 15 minutes with baking beans. Take them out.',
   'Beat {butter-unsalted} and {sugar-caster}. Beat in {egg-medium}.',
   'Stir in {ground-almonds}. Spread in the pastry case.',
   'Peel, halve and core {pear}. Slice. Press into the almond filling.',
   'Bake 35 minutes, until golden and set.'],
  serves=8, tier='everyday')

R('pear-ginger-cake', 'Pear and ginger upside-down cake', 'pudding',
  ['butter-unsalted 150g', 'sugar-soft-brown 150g', 'pear 2', 'egg-medium 3', 'flour-self-raising 150g', 'ginger-ground 2tsp', 'golden-syrup 2tbsp'],
  ['Heat the oven to 180C. Line a 20 cm tin.',
   'Spread {golden-syrup} over the base. Peel and slice {pear}. Lay on top.',
   'Beat {butter-unsalted} and {sugar-soft-brown} until fluffy.',
   'Beat in {egg-medium}. Fold in {flour-self-raising} and {ginger-ground}.',
   'Spread over the pears. Bake 40 minutes, until springy.',
   'Turn out upside down while warm.'],
  serves=8, tier='budget')

R('marmalade-bread-pudding', 'Brioche and marmalade bread pudding', 'pudding',
  ['brioche 250g', 'butter-unsalted 30g', 'jam-strawberry 3tbsp', 'egg-medium 3', 'milk-whole 300ml', 'double-cream 200ml', 'sugar-caster 50g'],
  ['Heat the oven to 170C.',
   'Slice {brioche}. Spread with {butter-unsalted} and {jam-strawberry}.',
   'Layer in a baking dish.',
   'Whisk {egg-medium}, {milk-whole}, {double-cream} and {sugar-caster}.',
   'Pour over. Leave 15 minutes to soak.',
   'Bake 35 minutes, until set and golden.'],
  serves=6, tier='budget', swaps=[('strawberry jam', 'Orange marmalade, for a bitter-sweet edge')])

R('caramel-apple-pots', 'Caramel apple pots', 'pudding',
  ['apple-medium 4', 'butter-unsalted 40g', 'sugar-soft-brown 60g', 'double-cream 200ml', 'ginger-nut-biscuits 6'],
  ['Peel, core and dice {apple-medium}.',
   'Melt {butter-unsalted} and {sugar-soft-brown} in a pan.',
   'Add the apples. Cook 8 minutes, until soft and caramel-coated. Cool.',
   'Whip {double-cream} to soft peaks.',
   'Layer apples and cream in glasses.',
   'Crumble {ginger-nut-biscuits} on top.'],
  serves=4, tier='budget')

R('parkin', 'Sticky ginger parkin', 'pudding',
  ['butter-unsalted 100g', 'golden-syrup 100g', 'black-treacle 50g', 'sugar-soft-brown 75g', 'flour-self-raising 100g', 'oats-rolled 100g', 'ginger-ground 2tsp', 'egg-medium 1', 'milk-whole 2tbsp'],
  ['Heat the oven to 160C. Line a 20 cm square tin.',
   'Melt {butter-unsalted}, {golden-syrup}, {black-treacle} and {sugar-soft-brown} together.',
   'Mix {flour-self-raising}, {oats-rolled} and {ginger-ground} in a bowl.',
   'Pour in the melted mix. Add {egg-medium} and {milk-whole}. Stir well.',
   'Pour into the tin. Bake 45 minutes, until firm.',
   'Cool. Wrap and leave a day before cutting. || It turns stickier as it sits.'],
  serves=12, tier='budget')

# ---- Drinks ----
R('spiced-apple', 'Hot spiced apple', 'drink',
  ['apple-juice 1000ml', 'cinnamon-stick 2', 'cloves 4', 'orange 1'],
  ['Pour {apple-juice} into a pan.',
   'Add {cinnamon-stick}, {cloves} and sliced {orange}.',
   'Warm 10 minutes, without boiling.',
   'Ladle into mugs.'],
  serves=6, tier='budget')

R('blackberry-soda', 'Blackberry and apple soda', 'drink',
  ['blackberries 200g', 'sugar-caster 60g', 'apple-juice 300ml', 'sparkling-water 1'],
  ['Crush {blackberries} with {sugar-caster}. Leave 10 minutes.',
   'Sieve out the seeds.',
   'Stir in {apple-juice}.',
   'Pour over ice. Top up with {sparkling-water}.'],
  serves=4, tier='budget')

R('pear-cider-punch', 'Spiced pear and cider punch', 'drink',
  ['cider-dry 1000ml', 'pear 2', 'cinnamon-stick 1', 'star-anise 2', 'honey 2tbsp'],
  ['Pour {cider-dry} into a pan.',
   'Slice {pear}. Add with {cinnamon-stick}, {star-anise} and {honey}.',
   'Warm 10 minutes, without boiling.',
   'Serve warm in mugs.'],
  serves=6, tier='budget')

R('bramble', 'Blackberry gin sour', 'drink',
  ['blackberries 100g', 'sugar-caster 2tbsp', 'spirit-40 100ml', 'lemon 2'],
  ['Crush {blackberries} with {sugar-caster}.',
   'Add {spirit-40} and the juice of {lemon}.',
   'Strain over crushed ice in 4 glasses.'],
  serves=4, tier='everyday', note='The spirit is gin.')

# ---- Menus ----
APL = ('Hot spiced apple', 'aut-spiced-apple')
BLK = ('Blackberry and apple soda', 'aut-blackberry-soda')
PUNCH = ('Spiced pear and cider punch', 'aut-pear-cider-punch')
BRAM = ('Blackberry gin sour', 'aut-bramble')

M('harvest-pork', 'Harvest supper', 'meat', 4, 'Pork and apple sausage rolls, pork with cider and apples, apple and blackberry crumble.',
  ('aut-pork-apple-sausage-rolls', BLK, 'A glass of dry cider'),
  ('aut-pork-cider-apples', APL, 'A dry Normandy cider or an oaked Chardonnay', ['aut-celeriac-mash', 'aut-garlic-kale']),
  ('aut-apple-blackberry-crumble', 'Hot custard and a pot of tea', 'A small glass of Calvados'))
M('beef-casserole-sunday', 'Casserole Sunday', 'meat', 6, 'Garlic mushrooms on toast, beef and red wine casserole, sticky parkin.',
  ('aut-garlic-mushrooms-toast', BLK, 'A Pinot Noir'),
  ('aut-beef-red-wine-casserole', APL, 'A Côtes du Rhône or Malbec', ['aut-celeriac-mash', 'aut-roast-roots']),
  ('aut-parkin', 'Hot milk with a pinch of ginger', 'A glass of tawny port'))
M('chicken-pie-night', 'Pie night', 'meat', 6, 'Beetroot and apple salad, chicken leek and mushroom pie, caramel apple pots.',
  ('aut-beetroot-apple-salad', BLK, 'A dry Riesling'),
  ('aut-chicken-mushroom-pie', APL, 'A white Burgundy', ['aut-garlic-kale']),
  ('aut-caramel-apple-pots', 'Cold milk or a pot of tea', PUNCH))
M('lamb-shank-feast', 'Lamb shank feast', 'meat', 4, 'Chicken livers on toast, lamb shanks with plums, pear and almond tart.',
  ('aut-chicken-liver-toasts', BLK, 'A glass of dry Amontillado sherry'),
  ('aut-lamb-shanks-plums', APL, 'A Rioja Reserva', ['aut-celeriac-mash', 'aut-roast-roots']),
  ('aut-pear-frangipane', 'A pot of tea', 'A late-harvest Sauternes'))
M('cod-lentil-supper', 'Cod and lentils', 'fish', 4, 'Smoked mackerel with beetroot, herb-crusted cod, roast plums.',
  ('aut-mackerel-beetroot', BLK, 'A dry Riesling'),
  ('aut-herb-crust-cod-lentils', APL, 'A white Rioja or Chablis'),
  ('aut-port-plums', 'Hot spiced tea', 'A glass of ruby port'))
M('haddock-gratin-supper', 'Smoked haddock supper', 'fish', 4, 'Roast squash soup, smoked haddock and leek gratin, baked apples.',
  ('aut-roast-squash-soup', APL, 'A Viognier'),
  ('aut-haddock-leek-gratin', BLK, 'An unoaked Chardonnay', ['aut-garlic-kale']),
  ('aut-baked-apples', 'Hot custard', PUNCH))
M('scallop-curry', 'Scallops and king prawns', 'shellfish', 4, 'Scallops with cauliflower purée, a squash and king prawn red curry, plums roasted in port.',
  ('aut-scallops-cauliflower', BLK, 'A white Burgundy'),
  ('aut-squash-prawn-curry', 'Lime and lemongrass iced tea', 'An off-dry Gewürztraminer'),
  ('aut-port-plums', APL, BRAM))
M('mushroom-risotto-night', 'Mushroom risotto night', 'vegetarian', 4, 'Pear, Stilton and chicory salad, mushroom risotto, pear and ginger cake.',
  ('aut-pear-stilton-chicory', BLK, 'A Sauternes-style sweet white with the Stilton, or a dry Riesling'),
  ('aut-wild-mushroom-risotto', APL, 'A Pinot Noir'),
  ('aut-pear-ginger-cake', 'Cold milk or a pot of tea', PUNCH))
M('squash-pasta-supper', 'Squash and sage', 'vegetarian', 4, 'Garlic mushrooms, roast squash and goats cheese pasta, brioche bread pudding.',
  ('aut-garlic-mushrooms-toast', BLK, 'A Soave'),
  ('aut-squash-sage-pasta', APL, 'An oaked Chardonnay', ['aut-apple-fennel-slaw']),
  ('aut-marmalade-bread-pudding', 'Hot milk', BRAM))
M('cauliflower-cheese-night', 'Cauliflower cheese night', 'vegetarian', 4, 'Beetroot, apple and walnut salad, cauliflower cheese, caramel apple pots.',
  ('aut-beetroot-apple-salad', BLK, 'A Beaujolais'),
  ('aut-cauliflower-cheese', APL, 'A Chenin Blanc', ['aut-roast-roots', 'aut-garlic-kale']),
  ('aut-caramel-apple-pots', 'A pot of tea', PUNCH))
M('cottage-pie-vegan', 'Mushroom cottage pie', 'vegan', 6, 'Roast squash soup, mushroom and lentil cottage pie, apple and blackberry crumble.',
  ('aut-roast-squash-soup', BLK, 'A Viognier'),
  ('aut-mushroom-lentil-cottage-pie', APL, 'A Côtes du Rhône', ['aut-garlic-kale', 'aut-roast-roots']),
  ('aut-apple-blackberry-crumble', 'Hot oat milk with cinnamon', PUNCH))
M('chilli-vegan', 'Pumpkin chilli', 'vegan', 6, 'Garlic mushrooms on toast, pumpkin and black bean chilli, baked apples.',
  ('aut-garlic-mushrooms-toast', BLK, 'A Pinot Noir'),
  ('aut-pumpkin-black-bean-chilli', APL, 'A Zinfandel or Malbec', ['aut-roast-squash-wedges']),
  ('aut-baked-apples', 'Hot spiced tea', BRAM))
M('beetroot-vegan', 'Beetroot and lentils', 'vegan', 4, 'Roast squash soup, warm beetroot and lentil salad, roast plums with coconut yoghurt.',
  ('aut-roast-squash-soup', APL, 'A dry Riesling'),
  ('aut-beetroot-lentil-salad', BLK, 'A light Pinot Noir', ['aut-apple-fennel-slaw']),
  ('aut-port-plums', 'Hot spiced tea', PUNCH))
