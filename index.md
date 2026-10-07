---
layout: default
title: Mark Paral
description: Aero/Astro Engineer
hide_title: true
---

<div class="home-intro">
  <h1 class="page-title">Thanks for stopping by!</h1>
  <p>I'm an aeronautical and astronautical engineer working on GNC and systems design for satellites. In my spare time, I build high-power rockets.</p>
</div>

<img src="{{ 'assets/images/Liftoff_wide.JPG' | relative_url }}" alt="Enlil lifting off" class="home-hero">

<h2 class="section-header">Featured</h2>

{% assign featured_items = site.publications | concat: site.projects | where_exp: "item", "item.featured" | sort: "featured" %}
{% for item in featured_items %}
<div class="project-grid">
  <img src="{{ item.image | default: '/assets/images/Circuit Rocket even.png' | relative_url }}" alt="{{ item.title }}" class="project-image">
  <div class="project-content">
    <h3 class="project-title">
      {% if item.collection == "publications" %}
      <a href="{{ item.link }}" target="_blank" rel="noopener noreferrer">{{ item.title }}</a>
      {% else %}
      <a href="{{ item.url | relative_url }}">{{ item.title }}</a>
      {% endif %}
    </h3>
    {% if item.collection == "publications" %}
    <p class="project-description">{% if item.award %}🏆 <strong>{{ item.award }}</strong> · {% endif %}{{ item.publisher }}</p>
    {% else %}
    <p class="project-description">{{ item.description }}</p>
    {% if item.demo %}<p class="project-demo"><a href="{{ item.demo | relative_url }}">Try the live demo →</a></p>{% endif %}
    {% endif %}
  </div>
</div>
{% endfor %}
